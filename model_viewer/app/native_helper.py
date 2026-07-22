#!/usr/bin/env python3
"""Safari-compatible local bridge for the OpenSCAD model viewer."""

from __future__ import annotations

import json
import mimetypes
import os
from pathlib import Path
import shutil
import subprocess
import threading
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse


APP_DIR = Path(__file__).resolve().parent
VIEWER_ROOT = APP_DIR.parent
WORKSPACE_ROOT = VIEWER_ROOT.parent
CONFIG_PATH = APP_DIR / "config.json"
SUPPORTED_EXTENSIONS = {".stl", ".3mf", ".obj", ".ply", ".amf", ".glb"}
MODEL_ROOTS = {"current_stl", "historical_stl"}
CHOSEN_DESTINATIONS: set[Path] = set()
WATCHER_LOCK = threading.Lock()
WATCHER_STATUS = {
    "enabled": False,
    "state": "idle",
    "message": "自动导出未配置",
    "lastRun": None,
}


def load_config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def read_current_project() -> str:
    try:
        text = (WORKSPACE_ROOT / "README.md").read_text(encoding="utf-8")
    except OSError:
        return "current-project"
    marker = "CURRENT_PROJECT:"
    if marker not in text:
        return "current-project"
    value = text.split(marker, 1)[1].splitlines()[0].strip().strip("`")
    return value or "current-project"


def read_project_status() -> str:
    value = str(load_config().get("projectStatus", "working")).strip().lower()
    return "completed" if value in {"completed", "complete", "done"} else "working"


def is_supported_model(path: Path) -> bool:
    return (
        path.is_file()
        and not path.name.startswith(".")
        and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def scan_models() -> list[dict]:
    current_project = read_current_project()
    models: list[dict] = []

    current_root = WORKSPACE_ROOT / "current_stl"
    if current_root.is_dir():
        for path in sorted(current_root.rglob("*")):
            if is_supported_model(path):
                models.append(model_record(path, "working", current_project))

    history_root = WORKSPACE_ROOT / "historical_stl"
    if history_root.is_dir():
        for project_dir in sorted(history_root.iterdir()):
            if not project_dir.is_dir() or project_dir.name.startswith("."):
                continue
            for path in sorted(project_dir.rglob("*")):
                if is_supported_model(path):
                    models.append(model_record(path, "done", project_dir.name))

    models.sort(
        key=lambda model: (
            0 if model["status"] == "working" else 1,
            -model["lastModified"] if model["status"] == "working" else 0,
            model["project"],
            model["name"],
        )
    )
    return models


def model_record(path: Path, status: str, project: str) -> dict:
    stat = path.stat()
    relative = path.relative_to(WORKSPACE_ROOT).as_posix()
    return {
        "id": f"{status}:{relative}",
        "name": path.name,
        "path": relative,
        "extension": path.suffix.lower().removeprefix("."),
        "status": status,
        "project": project,
        "size": stat.st_size,
        "lastModified": int(stat.st_mtime * 1000),
    }


def resolve_model(relative_path: str) -> Path:
    candidate = (WORKSPACE_ROOT / unquote(relative_path)).resolve()
    try:
        relative = candidate.relative_to(WORKSPACE_ROOT)
    except ValueError as error:
        raise PermissionError("模型路径不在工作区内") from error
    if not relative.parts or relative.parts[0] not in MODEL_ROOTS:
        raise PermissionError("只能读取当前或历史模型目录")
    if not is_supported_model(candidate):
        raise FileNotFoundError("模型不存在或格式不受支持")
    return candidate


def resolve_workspace_path(relative_path: str) -> Path:
    candidate = (WORKSPACE_ROOT / relative_path).resolve()
    try:
        candidate.relative_to(WORKSPACE_ROOT)
    except ValueError as error:
        raise PermissionError("配置路径不在工作区内") from error
    return candidate


def watcher_snapshot() -> dict:
    with WATCHER_LOCK:
        return dict(WATCHER_STATUS)


def set_watcher_status(**updates) -> None:
    with WATCHER_LOCK:
        WATCHER_STATUS.update(updates)


def scad_literal(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "undef"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def render_live_outputs(export_config: dict) -> None:
    source = resolve_workspace_path(export_config["source"])
    executable = Path(export_config.get("openscadExecutable", ""))
    if not source.is_file():
        raise FileNotFoundError(f"OpenSCAD 源文件不存在：{source}")
    if not executable.is_file():
        raise FileNotFoundError(f"OpenSCAD 不存在：{executable}")

    set_watcher_status(state="rendering", message="OpenSCAD 正在导出")
    for output_config in export_config.get("outputs", []):
        output = resolve_workspace_path(output_config["file"])
        if output.parent.name != "current_stl":
            raise PermissionError("自动导出目标必须位于 current_stl")
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary = output.with_name(f".{output.stem}.live-export{output.suffix}")
        command = [
            "/usr/bin/arch",
            "-arm64",
            str(executable),
            "-o",
            str(temporary),
        ]
        for key, value in output_config.get("defines", {}).items():
            command.extend(["-D", f"{key}={scad_literal(value)}"])
        command.append(str(source))

        try:
            result = subprocess.run(
                command,
                check=False,
                capture_output=True,
                text=True,
                timeout=600,
            )
            if result.returncode != 0 or not temporary.is_file():
                detail = (result.stderr or result.stdout or "OpenSCAD 导出失败").strip()
                raise RuntimeError(detail[-1200:])
            os.replace(temporary, output)
        finally:
            temporary.unlink(missing_ok=True)

    set_watcher_status(
        state="idle",
        message="OpenSCAD 自动导出已开启",
        lastRun=int(time.time() * 1000),
    )


def live_export_watcher() -> None:
    export_config = load_config().get("liveExport", {})
    if not export_config.get("enabled"):
        set_watcher_status(enabled=False, state="idle", message="自动导出未开启")
        return

    set_watcher_status(enabled=True, state="idle", message="OpenSCAD 自动导出已开启")
    try:
        source = resolve_workspace_path(export_config["source"])
    except (KeyError, PermissionError) as error:
        set_watcher_status(state="error", message=str(error))
        return

    last_seen: int | None = None
    while True:
        try:
            source_mtime = source.stat().st_mtime_ns
            outputs = [resolve_workspace_path(item["file"]) for item in export_config.get("outputs", [])]
            output_missing_or_old = any(
                not output.exists() or output.stat().st_mtime_ns < source_mtime
                for output in outputs
            )

            if last_seen is None:
                last_seen = source_mtime
                if output_missing_or_old:
                    render_live_outputs(export_config)
            elif source_mtime != last_seen:
                last_seen = source_mtime
                time.sleep(0.75)
                render_live_outputs(export_config)
        except Exception as error:  # Keep the watcher alive after a failed render.
            set_watcher_status(enabled=True, state="error", message=str(error)[-1200:])
        time.sleep(1.0)


class ViewerRequestHandler(SimpleHTTPRequestHandler):
    server_version = "OpenSCADViewer/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(VIEWER_ROOT), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            destination = next(iter(CHOSEN_DESTINATIONS), None)
            self.send_json(
                {
                    "ok": True,
                    "workspaceName": WORKSPACE_ROOT.name,
                    "destination": str(destination) if destination else "",
                    "destinationName": f"…/{destination.name}" if destination else "",
                    "watcher": watcher_snapshot(),
                }
            )
            return
        if parsed.path == "/api/models":
            self.send_json(
                {
                    "currentProject": read_current_project(),
                    "projectStatus": read_project_status(),
                    "models": scan_models(),
                    "watcher": watcher_snapshot(),
                }
            )
            return
        if parsed.path == "/api/file":
            query = parse_qs(parsed.query)
            try:
                path = resolve_model(query.get("path", [""])[0])
                self.send_model_file(path)
            except PermissionError as error:
                self.send_json({"error": str(error)}, HTTPStatus.FORBIDDEN)
            except FileNotFoundError as error:
                self.send_json({"error": str(error)}, HTTPStatus.NOT_FOUND)
            return
        super().do_GET()

    def do_POST(self):
        fetch_site = self.headers.get("Sec-Fetch-Site")
        origin = self.headers.get("Origin")
        if fetch_site not in (None, "same-origin"):
            self.send_json({"error": "拒绝非本机页面请求"}, HTTPStatus.FORBIDDEN)
            return
        if origin:
            parsed_origin = urlparse(origin)
            if parsed_origin.hostname not in {"127.0.0.1", "localhost"}:
                self.send_json({"error": "拒绝非本机页面请求"}, HTTPStatus.FORBIDDEN)
                return

        parsed = urlparse(self.path)
        if parsed.path == "/api/choose-destination":
            self.choose_destination()
            return
        if parsed.path == "/api/export":
            self.export_model()
            return
        self.send_json({"error": "接口不存在"}, HTTPStatus.NOT_FOUND)

    def choose_destination(self):
        script = 'POSIX path of (choose folder with prompt "选择模型导出位置（可选择 U 盘）")'
        result = subprocess.run(
            ["/usr/bin/osascript", "-e", script],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            self.send_json({"error": "用户取消位置选择"}, 499)
            return
        destination = Path(result.stdout.strip()).resolve()
        if not destination.is_dir():
            self.send_json({"error": "所选位置不是文件夹"}, HTTPStatus.BAD_REQUEST)
            return
        CHOSEN_DESTINATIONS.clear()
        CHOSEN_DESTINATIONS.add(destination)
        self.send_json(
            {
                "destination": str(destination),
                "displayName": f"…/{destination.name}",
            }
        )

    def export_model(self):
        try:
            payload = self.read_json_body()
            source = resolve_model(str(payload.get("path", "")))
            destination = Path(str(payload.get("destination", ""))).resolve()
            if destination not in CHOSEN_DESTINATIONS or not destination.is_dir():
                raise PermissionError("请先通过位置栏重新选择导出文件夹")
            target = destination / source.name
            if target.exists() and not payload.get("overwrite", False):
                self.send_json({"error": "目标文件已存在"}, HTTPStatus.CONFLICT)
                return
            shutil.copy2(source, target)
            self.send_json({"displayPath": f"{destination.name}/{source.name}"})
        except PermissionError as error:
            self.send_json({"error": str(error)}, HTTPStatus.FORBIDDEN)
        except FileNotFoundError as error:
            self.send_json({"error": str(error)}, HTTPStatus.NOT_FOUND)
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        except OSError as error:
            self.send_json({"error": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 64 * 1024:
            raise ValueError("请求内容大小无效")
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_model_file(self, path: Path):
        size = path.stat().st_size
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        with path.open("rb") as source:
            shutil.copyfileobj(source, self.wfile, length=1024 * 1024)

    def send_json(self, payload: dict, status: int = HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, message, *args):
        print(f"[viewer] {self.address_string()} - {message % args}")


class ViewerServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def start_server() -> None:
    server = None
    for port in range(8765, 8776):
        try:
            server = ViewerServer(("127.0.0.1", port), ViewerRequestHandler)
            break
        except OSError:
            continue
    if server is None:
        raise RuntimeError("8765–8775 端口均被占用")

    if os.environ.get("OPENSCAD_VIEWER_SKIP_WATCHER") != "1":
        watcher = threading.Thread(target=live_export_watcher, name="openscad-live-export", daemon=True)
        watcher.start()

    url = f"http://127.0.0.1:{server.server_port}/"
    print(f"OpenSCAD 模型查看器已启动：{url}")
    print("保持此窗口开启即可实时更新；按 Control-C 退出。")
    if os.environ.get("OPENSCAD_VIEWER_SKIP_BROWSER") != "1":
        threading.Timer(
            0.4,
            lambda: subprocess.Popen(
                ["/usr/bin/open", "-a", "Safari", url],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            ),
        ).start()

    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("\n模型查看器已关闭。")
    finally:
        server.server_close()


if __name__ == "__main__":
    start_server()
