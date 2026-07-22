import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { AMFLoader } from "three/addons/loaders/AMFLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const SUPPORTED_EXTENSIONS = new Set(["stl", "3mf", "obj", "ply", "amf", "glb"]);
const HANDLE_DB = "openscad-live-model-viewer";
const HANDLE_STORE = "handles";
const POLL_INTERVAL_MS = 1600;

const elements = {
  canvas: document.getElementById("model-canvas"),
  canvasWrap: document.getElementById("canvas-wrap"),
  emptyState: document.getElementById("empty-state"),
  loadingState: document.getElementById("loading-state"),
  gridLabel: document.getElementById("grid-label"),
  activeName: document.getElementById("active-model-name"),
  modelStatus: document.getElementById("model-status"),
  toggleWireframe: document.getElementById("toggle-wireframe"),
  resetCamera: document.getElementById("reset-camera"),
  connectWorkspace: document.getElementById("connect-workspace"),
  connectWorkspaceMain: document.getElementById("connect-workspace-main"),
  workspaceName: document.getElementById("workspace-name"),
  workspaceHint: document.getElementById("workspace-hint"),
  workspaceFallback: document.getElementById("workspace-fallback"),
  refreshModels: document.getElementById("refresh-models"),
  modelList: document.getElementById("model-list"),
  chooseDestination: document.getElementById("choose-destination"),
  destinationName: document.getElementById("destination-name"),
  destinationHint: document.getElementById("destination-hint"),
  exportModel: document.getElementById("export-model"),
  toast: document.getElementById("toast"),
  statusFormat: document.getElementById("status-format"),
  statusDimensions: document.getElementById("status-dimensions"),
  statusTriangles: document.getElementById("status-triangles"),
  statusSize: document.getElementById("status-size"),
  statusUpdated: document.getElementById("status-updated"),
  statusLive: document.getElementById("status-live"),
};

const state = {
  nativeMode: false,
  nativeDestination: "",
  watcherStatus: null,
  workspaceHandle: null,
  destinationHandle: null,
  fallbackFiles: [],
  records: [],
  activeRecord: null,
  activeSignature: "",
  currentProject: "current-project",
  currentProjectStatus: "working",
  wireframe: false,
  scanInProgress: false,
  toastTimer: null,
  modelObject: null,
  modelBox: new THREE.Box3(),
};

const supportsDirectoryAccess = typeof window.showDirectoryPicker === "function";

let renderer;
let scene;
let camera;
let controls;
let modelRoot;
let grid;

initThree();
bindEvents();
configureCapabilityMessage();
bootstrap();
window.setInterval(pollCurrentWorkspace, POLL_INTERVAL_MS);

async function bootstrap() {
  if (await connectNativeHelper()) {
    await refreshNativeWorkspace({ preserveSelection: false });
    return;
  }
  await restoreSavedHandles();
}

function initThree() {
  renderer = new THREE.WebGLRenderer({
    canvas: elements.canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 5000);
  camera.position.set(120, 95, 135);

  controls = new OrbitControls(camera, elements.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 5000;

  const hemisphere = new THREE.HemisphereLight(0xddeeff, 0x18202a, 2.3);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(90, 150, 110);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x78a8ff, 1.2);
  rimLight.position.set(-120, 55, -80);
  scene.add(rimLight);

  grid = new THREE.GridHelper(500, 50, 0x3d5960, 0x202a31);
  grid.material.opacity = 0.55;
  grid.material.transparent = true;
  grid.visible = false;
  scene.add(grid);

  modelRoot = new THREE.Group();
  scene.add(modelRoot);

  const resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(elements.canvasWrap);
  resizeRenderer();
  renderLoop();
}

function resizeRenderer() {
  const width = Math.max(1, elements.canvasWrap.clientWidth);
  const height = Math.max(1, elements.canvasWrap.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function renderLoop() {
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(renderLoop);
}

function bindEvents() {
  elements.connectWorkspace.addEventListener("click", connectWorkspace);
  elements.connectWorkspaceMain.addEventListener("click", connectWorkspace);
  elements.refreshModels.addEventListener("click", manualRefresh);
  elements.workspaceFallback.addEventListener("change", useFallbackFiles);
  elements.chooseDestination.addEventListener("click", chooseDestination);
  elements.exportModel.addEventListener("click", exportActiveModel);
  elements.resetCamera.addEventListener("click", fitCameraToModel);
  elements.toggleWireframe.addEventListener("click", toggleWireframe);
}

function configureCapabilityMessage() {
  if (supportsDirectoryAccess) {
    elements.workspaceHint.textContent = "首次使用需要允许浏览器读取模型目录；授权后会自动刷新。";
    elements.destinationHint.textContent = "系统位置选择器可以访问外置硬盘和 U 盘。";
    return;
  }

  elements.workspaceHint.textContent = "此浏览器使用兼容读取模式；刷新时需要重新选择目录。";
  elements.destinationHint.textContent = "此浏览器会通过下载导出；如需固定目录和 U 盘复制，请使用 Chrome 或本机 App。";
  elements.destinationName.textContent = "由浏览器下载设置决定";
}

async function connectNativeHelper() {
  if (!/^https?:$/.test(window.location.protocol) || !["127.0.0.1", "localhost"].includes(window.location.hostname)) {
    return false;
  }

  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    state.nativeMode = true;
    state.nativeDestination = data.destination || "";
    elements.workspaceName.textContent = data.workspaceName;
    elements.workspaceHint.textContent = "Safari 本机模式：目录监听和 OpenSCAD 自动导出已连接。";
    elements.destinationName.textContent = data.destinationName || "点击打开 Finder 位置选择";
    elements.destinationHint.textContent = "使用 macOS 原生位置选择器，可直接选择外置硬盘或 U 盘。";
    return true;
  } catch {
    return false;
  }
}

async function restoreSavedHandles() {
  if (!supportsDirectoryAccess) return;

  try {
    const savedWorkspace = await loadHandle("workspace");
    if (savedWorkspace) {
      const permission = await savedWorkspace.queryPermission({ mode: "read" });
      state.workspaceHandle = savedWorkspace;
      elements.workspaceName.textContent = permission === "granted"
        ? savedWorkspace.name
        : `重新连接：${savedWorkspace.name}`;

      if (permission === "granted") {
        await refreshWorkspace({ preserveSelection: false });
      }
    }

    const savedDestination = await loadHandle("destination");
    if (savedDestination) {
      state.destinationHandle = savedDestination;
      elements.destinationName.textContent = `…/${savedDestination.name}`;
    }
  } catch (error) {
    console.warn("Unable to restore directory handles", error);
  }
}

async function connectWorkspace() {
  if (state.nativeMode) {
    await refreshNativeWorkspace({ preserveSelection: true, forceReload: true });
    return;
  }

  if (!supportsDirectoryAccess) {
    elements.workspaceFallback.value = "";
    elements.workspaceFallback.click();
    return;
  }

  try {
    let handle = state.workspaceHandle;
    if (handle) {
      const permission = await handle.requestPermission({ mode: "read" });
      if (permission !== "granted") handle = null;
    }

    if (!handle) {
      handle = await window.showDirectoryPicker({
        id: "openscad-model-workspace",
        mode: "read",
      });
    }

    state.workspaceHandle = handle;
    state.fallbackFiles = [];
    elements.workspaceName.textContent = handle.name;
    await saveHandle("workspace", handle);
    await refreshWorkspace({ preserveSelection: false });
  } catch (error) {
    if (error?.name !== "AbortError") {
      showToast(`无法读取工作区：${error.message}`, true);
    }
  }
}

async function manualRefresh() {
  if (state.nativeMode) {
    await refreshNativeWorkspace({ preserveSelection: true, forceReload: true });
    showToast("模型列表已重新读取");
    return;
  }

  if (state.workspaceHandle) {
    await refreshWorkspace({ preserveSelection: true, forceReload: true });
    showToast("模型列表已重新读取");
    return;
  }

  if (state.fallbackFiles.length) {
    elements.workspaceFallback.value = "";
    elements.workspaceFallback.click();
    return;
  }

  await connectWorkspace();
}

async function useFallbackFiles(event) {
  const files = [...event.target.files];
  if (!files.length) return;

  state.workspaceHandle = null;
  state.fallbackFiles = files;
  state.currentProjectStatus = "working";
  const rootReadme = files.find((file) => {
    const parts = (file.webkitRelativePath || file.name).split("/").filter(Boolean);
    return file.name === "README.md" && parts.length <= 2;
  });
  if (rootReadme) {
    const text = await rootReadme.text();
    const match = text.match(/CURRENT_PROJECT:\s*([^`\s]+)/);
    if (match?.[1]) state.currentProject = match[1];
  }
  const viewerConfig = files.find((file) => {
    const path = (file.webkitRelativePath || file.name).replaceAll("\\", "/");
    return path.endsWith("/model_viewer/app/config.json");
  });
  if (viewerConfig) {
    try {
      const config = JSON.parse(await viewerConfig.text());
      state.currentProjectStatus = normalizeProjectStatus(config.projectStatus);
    } catch {
      state.currentProjectStatus = "working";
    }
  }
  const firstPath = files[0].webkitRelativePath || files[0].name;
  elements.workspaceName.textContent = firstPath.split("/")[0] || "已选择目录";
  state.records = scanFallbackFiles(files);
  renderModelList();
  await selectDefaultRecord();
}

async function refreshWorkspace({ preserveSelection = true, forceReload = false, silent = false } = {}) {
  if (!state.workspaceHandle || state.scanInProgress) return;
  state.scanInProgress = true;

  if (!silent) setLoading(true);

  try {
    const previousId = preserveSelection ? state.activeRecord?.id : null;
    const previousSignature = state.activeSignature;
    const result = await scanWorkspaceHandle(state.workspaceHandle);
    state.records = result.records;
    state.currentProject = result.currentProject;
    state.currentProjectStatus = result.projectStatus;
    renderModelList();

    let nextRecord = previousId
      ? state.records.find((record) => record.id === previousId)
      : null;
    if (!nextRecord) nextRecord = getDefaultRecord();

    if (!nextRecord) {
      clearActiveModel();
      showEmptyState("没有找到模型", "current_stl 和 historical_stl 中没有支持的 3D 文件。", false);
      return;
    }

    const changed = fileSignature(nextRecord) !== previousSignature;
    if (!state.activeRecord || nextRecord.id !== state.activeRecord.id || changed || forceReload) {
      await openRecord(nextRecord, { silent });
    } else {
      state.activeRecord = nextRecord;
      updateActiveListItem();
      updateStatusHeader(nextRecord);
      updateLiveStatus(nextRecord);
    }
  } catch (error) {
    if (!silent) {
      showToast(`读取模型目录失败：${error.message}`, true);
      showEmptyState("无法读取工作区", "请重新选择 OpenSCAD 根目录并允许读取权限。", true);
    }
  } finally {
    state.scanInProgress = false;
    if (!silent) setLoading(false);
  }
}

async function refreshNativeWorkspace({ preserveSelection = true, forceReload = false, silent = false } = {}) {
  if (!state.nativeMode || state.scanInProgress) return;
  state.scanInProgress = true;
  if (!silent) setLoading(true);

  try {
    const previousId = preserveSelection ? state.activeRecord?.id : null;
    const previousSignature = state.activeSignature;
    const response = await fetch(`/api/models?time=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`本机服务返回 ${response.status}`);
    const data = await response.json();
    state.currentProject = data.currentProject || "current-project";
    state.currentProjectStatus = normalizeProjectStatus(data.projectStatus);
    state.watcherStatus = data.watcher || null;
    state.records = (data.models || []).map((record) => ({
      ...record,
      native: true,
      handle: null,
      file: null,
    }));
    sortRecords(state.records);
    renderModelList();

    let nextRecord = previousId
      ? state.records.find((record) => record.id === previousId)
      : null;
    if (!nextRecord) nextRecord = getDefaultRecord();

    if (!nextRecord) {
      clearActiveModel();
      showEmptyState("没有找到模型", "current_stl 和 historical_stl 中没有支持的 3D 文件。", false);
      return;
    }

    const changed = fileSignature(nextRecord) !== previousSignature;
    if (!state.activeRecord || nextRecord.id !== state.activeRecord.id || changed || forceReload) {
      await openRecord(nextRecord, { silent });
    } else {
      state.activeRecord = nextRecord;
      updateActiveListItem();
      updateStatusHeader(nextRecord);
      updateLiveStatus(nextRecord);
    }
  } catch (error) {
    if (!silent) {
      showToast(`Safari 本机服务连接失败：${error.message}`, true);
      showEmptyState("本机服务已断开", "请重新双击 open-in-safari.command。", false);
    }
  } finally {
    state.scanInProgress = false;
    if (!silent) setLoading(false);
  }
}

async function scanWorkspaceHandle(rootHandle) {
  const currentProject = await readCurrentProject(rootHandle);
  const projectStatus = await readProjectStatus(rootHandle);
  const records = [];
  const currentDirectory = await getOptionalDirectory(rootHandle, "current_stl");
  const historyDirectory = await getOptionalDirectory(rootHandle, "historical_stl");

  if (currentDirectory) {
    await collectHandleModels({
      directory: currentDirectory,
      pathParts: ["current_stl"],
      records,
      status: "working",
      project: currentProject,
    });
  }

  if (historyDirectory) {
    for await (const [projectName, entry] of historyDirectory.entries()) {
      if (entry.kind !== "directory") continue;
      await collectHandleModels({
        directory: entry,
        pathParts: ["historical_stl", projectName],
        records,
        status: "done",
        project: projectName,
      });
    }
  }

  sortRecords(records);
  return { records, currentProject, projectStatus };
}

async function collectHandleModels({ directory, pathParts, records, status, project }) {
  for await (const [name, entry] of directory.entries()) {
    if (entry.kind === "directory") {
      await collectHandleModels({
        directory: entry,
        pathParts: [...pathParts, name],
        records,
        status,
        project,
      });
      continue;
    }

    const extension = getExtension(name);
    if (!SUPPORTED_EXTENSIONS.has(extension)) continue;
    const file = await entry.getFile();
    const path = [...pathParts, name].join("/");
    records.push({
      id: `${status}:${path}`,
      name,
      path,
      extension,
      status,
      project,
      handle: entry,
      file: null,
      size: file.size,
      lastModified: file.lastModified,
    });
  }
}

function scanFallbackFiles(files) {
  const records = [];

  for (const file of files) {
    const extension = getExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.has(extension)) continue;

    const normalizedPath = file.webkitRelativePath || file.name;
    const parts = normalizedPath.split("/").filter(Boolean);
    const currentIndex = parts.indexOf("current_stl");
    const historyIndex = parts.indexOf("historical_stl");
    let status;
    let project;
    let relativePath;

    if (currentIndex >= 0) {
      status = "working";
      project = state.currentProject;
      relativePath = parts.slice(currentIndex).join("/");
    } else if (historyIndex >= 0 && parts[historyIndex + 1]) {
      status = "done";
      project = parts[historyIndex + 1];
      relativePath = parts.slice(historyIndex).join("/");
    } else {
      continue;
    }

    records.push({
      id: `${status}:${relativePath}`,
      name: file.name,
      path: relativePath,
      extension,
      status,
      project,
      handle: null,
      file,
      size: file.size,
      lastModified: file.lastModified,
    });
  }

  sortRecords(records);
  return records;
}

function sortRecords(records) {
  records.sort((a, b) => {
    if (a.status !== b.status) return a.status === "working" ? -1 : 1;
    if (a.status === "working") return b.lastModified - a.lastModified || a.name.localeCompare(b.name);
    return a.project.localeCompare(b.project) || a.name.localeCompare(b.name);
  });
}

async function readCurrentProject(rootHandle) {
  try {
    const readmeHandle = await rootHandle.getFileHandle("README.md");
    const text = await (await readmeHandle.getFile()).text();
    const match = text.match(/CURRENT_PROJECT:\s*([^`\s]+)/);
    return match?.[1] || "current-project";
  } catch {
    return "current-project";
  }
}

async function readProjectStatus(rootHandle) {
  try {
    const viewerDirectory = await rootHandle.getDirectoryHandle("model_viewer");
    const appDirectory = await viewerDirectory.getDirectoryHandle("app");
    const configHandle = await appDirectory.getFileHandle("config.json");
    const config = JSON.parse(await (await configHandle.getFile()).text());
    return normalizeProjectStatus(config.projectStatus);
  } catch {
    return "working";
  }
}

async function getOptionalDirectory(parent, name) {
  try {
    return await parent.getDirectoryHandle(name);
  } catch (error) {
    if (error?.name === "NotFoundError") return null;
    throw error;
  }
}

function renderModelList() {
  elements.modelList.replaceChildren();
  const currentRecords = state.records.filter((record) => record.status === "working");
  const historyRecords = state.records.filter((record) => record.status === "done");

  if (!state.records.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "list-placeholder";
    placeholder.textContent = "没有找到支持的模型文件。";
    elements.modelList.append(placeholder);
    elements.exportModel.disabled = true;
    return;
  }

  if (currentRecords.length) {
    const currentLabel = projectStatusLabel(state.currentProjectStatus);
    elements.modelList.append(createGroup(`当前项目 · ${currentLabel}`, currentRecords, false));
  }

  if (historyRecords.length) {
    const historyGroup = document.createElement("section");
    historyGroup.className = "model-group";
    historyGroup.append(createGroupHeading("制作完成", historyRecords.length));

    const projects = new Map();
    for (const record of historyRecords) {
      if (!projects.has(record.project)) projects.set(record.project, []);
      projects.get(record.project).push(record);
    }

    for (const [project, records] of projects) {
      const label = document.createElement("p");
      label.className = "project-label";
      label.textContent = humanize(project);
      historyGroup.append(label);
      for (const record of records) historyGroup.append(createModelButton(record, true));
    }
    elements.modelList.append(historyGroup);
  }

  updateActiveListItem();
}

function createGroup(title, records, isHistory) {
  const group = document.createElement("section");
  group.className = "model-group";
  group.append(createGroupHeading(title, records.length));
  for (const record of records) group.append(createModelButton(record, isHistory));
  return group;
}

function createGroupHeading(title, count) {
  const heading = document.createElement("div");
  heading.className = "group-heading";
  const label = document.createElement("span");
  label.textContent = title;
  const tally = document.createElement("span");
  tally.className = "group-count";
  tally.textContent = String(count);
  heading.append(label, tally);
  return heading;
}

function createModelButton(record, isHistory) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `model-item${isHistory ? " is-history" : ""}`;
  button.dataset.recordId = record.id;
  button.addEventListener("click", () => openRecord(record));

  const copy = document.createElement("span");
  copy.className = "model-copy";
  const name = document.createElement("span");
  name.className = "model-name";
  name.textContent = stripExtension(record.name);
  const meta = document.createElement("span");
  meta.className = "model-meta";
  meta.textContent = `${formatDate(record.lastModified)} · ${formatBytes(record.size)}`;
  copy.append(name, meta);

  const format = document.createElement("span");
  format.className = "format-chip";
  format.textContent = record.extension.toUpperCase();
  button.append(copy, format);
  return button;
}

async function selectDefaultRecord() {
  const record = getDefaultRecord();
  if (record) await openRecord(record);
  else showEmptyState("没有找到模型", "所选目录中没有可预览的 current_stl 或 historical_stl 文件。", false);
}

function getDefaultRecord() {
  return state.records.find((record) => record.status === "working") || state.records[0] || null;
}

async function openRecord(record, { silent = false } = {}) {
  state.activeRecord = record;
  updateActiveListItem();
  updateStatusHeader(record);
  elements.exportModel.disabled = false;
  elements.emptyState.hidden = true;
  if (!silent) setLoading(true);

  try {
    const file = await getFreshFile(record);
    const object = await parseModelFile(file, record.extension);
    displayModelObject(object, record.extension);
    state.activeSignature = `${file.size}:${file.lastModified}`;
    record.size = file.size;
    record.lastModified = file.lastModified;
    updateFileStatus(record, file);
    updateActiveListItem();
  } catch (error) {
    console.error(error);
    showToast(`无法打开 ${record.name}：${error.message}`, true);
  } finally {
    if (!silent) setLoading(false);
  }
}

async function getFreshFile(record) {
  if (record.native) {
    const query = new URLSearchParams({ path: record.path, time: String(record.lastModified) });
    const response = await fetch(`/api/file?${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`文件读取失败（${response.status}）`);
    const buffer = await response.arrayBuffer();
    return new File([buffer], record.name, {
      type: response.headers.get("content-type") || "application/octet-stream",
      lastModified: record.lastModified,
    });
  }
  if (record.handle) return record.handle.getFile();
  if (record.file) return record.file;
  throw new Error("文件访问权限已失效");
}

async function parseModelFile(file, extension) {
  const buffer = await file.arrayBuffer();

  if (extension === "stl") {
    const geometry = new STLLoader().parse(buffer);
    geometry.computeVertexNormals();
    const hasColors = geometry.hasAttribute("color");
    const material = new THREE.MeshStandardMaterial({
      color: hasColors ? 0xffffff : 0x73d8b0,
      vertexColors: hasColors,
      metalness: 0.04,
      roughness: 0.58,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }

  if (extension === "3mf") return new ThreeMFLoader().parse(buffer);

  if (extension === "obj") {
    return new OBJLoader().parse(new TextDecoder().decode(buffer));
  }

  if (extension === "ply") {
    const geometry = new PLYLoader().parse(buffer);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, defaultMaterial(geometry.hasAttribute("color")));
  }

  if (extension === "amf") return new AMFLoader().parse(buffer);

  if (extension === "glb") {
    const gltf = await new Promise((resolve, reject) => {
      new GLTFLoader().parse(buffer, "", resolve, reject);
    });
    return gltf.scene;
  }

  throw new Error(`暂不支持 .${extension}`);
}

function defaultMaterial(vertexColors = false) {
  return new THREE.MeshStandardMaterial({
    color: vertexColors ? 0xffffff : 0x73d8b0,
    vertexColors,
    metalness: 0.04,
    roughness: 0.58,
    side: THREE.DoubleSide,
  });
}

function displayModelObject(object, extension) {
  clearModelRoot();

  const wrapper = new THREE.Group();
  wrapper.add(object);
  if (extension !== "glb") wrapper.rotation.x = -Math.PI / 2;
  wrapper.updateMatrixWorld(true);

  applyMaterials(wrapper);
  const initialBox = new THREE.Box3().setFromObject(wrapper);
  if (initialBox.isEmpty()) throw new Error("模型中没有可显示的网格");

  const center = initialBox.getCenter(new THREE.Vector3());
  wrapper.position.x -= center.x;
  wrapper.position.z -= center.z;
  wrapper.position.y -= initialBox.min.y;
  wrapper.updateMatrixWorld(true);

  modelRoot.add(wrapper);
  state.modelObject = wrapper;
  state.modelBox.setFromObject(modelRoot);
  grid.visible = true;
  elements.gridLabel.hidden = false;
  fitCameraToModel();
}

function applyMaterials(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;

    if (!child.material) {
      child.material = defaultMaterial(child.geometry?.hasAttribute("color"));
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if ("wireframe" in material) material.wireframe = state.wireframe;
      if ("side" in material) material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    }
  });
}

function clearModelRoot() {
  for (const child of [...modelRoot.children]) {
    modelRoot.remove(child);
    child.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) material.dispose?.();
      }
    });
  }
  state.modelObject = null;
  state.modelBox.makeEmpty();
}

function clearActiveModel() {
  clearModelRoot();
  state.activeRecord = null;
  state.activeSignature = "";
  grid.visible = false;
  elements.gridLabel.hidden = true;
  elements.exportModel.disabled = true;
  resetStatusbar();
  updateActiveListItem();
}

function fitCameraToModel() {
  if (!state.modelObject || state.modelBox.isEmpty()) return;

  const box = new THREE.Box3().setFromObject(modelRoot);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.5);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius / Math.sin(fov / 2)) * 1.15;
  const direction = new THREE.Vector3(1, 0.78, 1).normalize();

  camera.position.copy(sphere.center).addScaledVector(direction, distance);
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = Math.max(distance * 20, 1000);
  camera.updateProjectionMatrix();
  controls.target.copy(sphere.center);
  controls.minDistance = radius * 0.08;
  controls.maxDistance = radius * 25;
  controls.update();
}

function toggleWireframe() {
  state.wireframe = !state.wireframe;
  elements.toggleWireframe.setAttribute("aria-pressed", String(state.wireframe));
  if (state.modelObject) applyMaterials(state.modelObject);
}

function updateStatusHeader(record) {
  const lifecycleStatus = record.status === "done" ? "completed" : state.currentProjectStatus;
  elements.activeName.textContent = stripExtension(record.name);
  elements.modelStatus.textContent = projectStatusLabel(lifecycleStatus);
  elements.modelStatus.className = `status-badge ${lifecycleStatus === "working" ? "status-working" : "status-done"}`;
}

function updateFileStatus(record, file) {
  const box = new THREE.Box3().setFromObject(modelRoot);
  const size = box.getSize(new THREE.Vector3());
  const dimensions = record.extension === "glb"
    ? [size.x, size.y, size.z]
    : [size.x, size.z, size.y];

  elements.statusFormat.textContent = record.extension.toUpperCase();
  elements.statusDimensions.textContent = `尺寸 ${dimensions.map(formatMillimeters).join(" × ")} mm`;
  elements.statusTriangles.textContent = `面数 ${formatInteger(countTriangles(modelRoot))}`;
  elements.statusSize.textContent = `大小 ${formatBytes(file.size)}`;
  elements.statusUpdated.textContent = `更新时间 ${formatDateTime(file.lastModified)}`;
  updateLiveStatus(record);
}

function updateLiveStatus(record) {
  const live = record.status === "working" && (record.handle || record.native);
  if (record.native && live && state.watcherStatus?.state === "rendering") {
    elements.statusLive.textContent = "● OpenSCAD 正在重新导出";
  } else if (record.native && live && state.watcherStatus?.state === "error") {
    elements.statusLive.textContent = "OpenSCAD 自动导出失败";
  } else if (record.native && live) {
    elements.statusLive.textContent = state.watcherStatus?.enabled
      ? "● 已与 OpenSCAD 同步"
      : "● 模型文件自动刷新已开启";
  } else if (live) {
    elements.statusLive.textContent = "● 文件自动刷新已开启";
  } else {
    elements.statusLive.textContent = "手动刷新模式";
  }
  elements.statusLive.className = `live-state${live && state.watcherStatus?.state !== "error" ? " live-on" : ""}`;
}

function resetStatusbar() {
  elements.activeName.textContent = "模型查看器";
  elements.modelStatus.textContent = "等待连接";
  elements.modelStatus.className = "status-badge status-idle";
  elements.statusFormat.textContent = "—";
  elements.statusDimensions.textContent = "尺寸 —";
  elements.statusTriangles.textContent = "面数 —";
  elements.statusSize.textContent = "大小 —";
  elements.statusUpdated.textContent = "更新时间 —";
  elements.statusLive.textContent = "自动刷新未连接";
  elements.statusLive.className = "live-state";
}

function countTriangles(root) {
  let total = 0;
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    total += child.geometry.index
      ? child.geometry.index.count / 3
      : (child.geometry.attributes.position?.count || 0) / 3;
  });
  return Math.round(total);
}

function updateActiveListItem() {
  for (const button of elements.modelList.querySelectorAll(".model-item")) {
    const active = button.dataset.recordId === state.activeRecord?.id;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
}

async function pollCurrentWorkspace() {
  if (state.scanInProgress || document.hidden) return;
  if (state.nativeMode) {
    await refreshNativeWorkspace({ preserveSelection: true, silent: true });
    return;
  }
  if (!state.workspaceHandle) return;
  await refreshWorkspace({ preserveSelection: true, silent: true });
}

async function chooseDestination() {
  if (state.nativeMode) {
    try {
      const response = await fetch("/api/choose-destination", { method: "POST" });
      if (!response.ok) {
        if (response.status === 499) return;
        throw new Error(`位置选择失败（${response.status}）`);
      }
      const data = await response.json();
      state.nativeDestination = data.destination;
      elements.destinationName.textContent = data.displayName;
    } catch (error) {
      showToast(error.message, true);
    }
    return;
  }

  if (!supportsDirectoryAccess) {
    state.destinationHandle = null;
    elements.destinationName.textContent = "导出时由浏览器保存";
    showToast("Safari/Firefox 将使用浏览器下载；可在浏览器设置中开启“每次询问下载位置”。");
    return;
  }

  try {
    const handle = await window.showDirectoryPicker({
      id: "openscad-model-export",
      mode: "readwrite",
      startIn: "downloads",
    });
    state.destinationHandle = handle;
    elements.destinationName.textContent = `…/${handle.name}`;
    await saveHandle("destination", handle);
  } catch (error) {
    if (error?.name !== "AbortError") showToast(`无法选择导出位置：${error.message}`, true);
  }
}

async function exportActiveModel() {
  const record = state.activeRecord;
  if (!record) return;

  try {
    if (state.nativeMode) {
      if (!state.nativeDestination) {
        await chooseDestination();
        if (!state.nativeDestination) return;
      }

      let response = await requestNativeExport(record, false);
      if (response.status === 409) {
        if (!window.confirm(`${record.name} 已存在。是否覆盖？`)) return;
        response = await requestNativeExport(record, true);
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `导出失败（${response.status}）`);
      }
      const data = await response.json();
      showToast(`已导出到 ${data.displayPath}`);
      return;
    }

    const file = await getFreshFile(record);

    if (!supportsDirectoryAccess || !state.destinationHandle) {
      if (supportsDirectoryAccess && !state.destinationHandle) {
        await chooseDestination();
        if (!state.destinationHandle) return;
      } else {
        downloadFile(file, record.name);
        showToast(`已交给浏览器保存：${record.name}`);
        return;
      }
    }

    const permission = await state.destinationHandle.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") throw new Error("没有目标文件夹写入权限");

    let exists = false;
    try {
      await state.destinationHandle.getFileHandle(record.name);
      exists = true;
    } catch (error) {
      if (error?.name !== "NotFoundError") throw error;
    }

    if (exists && !window.confirm(`${record.name} 已存在。是否覆盖？`)) return;

    const targetHandle = await state.destinationHandle.getFileHandle(record.name, { create: true });
    const writable = await targetHandle.createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();
    showToast(`已导出到 ${state.destinationHandle.name}/${record.name}`);
  } catch (error) {
    if (error?.name !== "AbortError") showToast(`导出失败：${error.message}`, true);
  }
}

function requestNativeExport(record, overwrite) {
  return fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: record.path,
      destination: state.nativeDestination,
      overwrite,
    }),
  });
}

function downloadFile(file, name) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showEmptyState(title, message, showConnectButton = true) {
  elements.emptyState.hidden = false;
  elements.emptyState.querySelector("h2").textContent = title;
  elements.emptyState.querySelector("p").textContent = message;
  elements.connectWorkspaceMain.hidden = !showConnectButton;
}

function setLoading(loading) {
  elements.loadingState.hidden = !loading;
}

function showToast(message, isError = false) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast${isError ? " is-error" : ""}`;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, isError ? 5200 : 3200);
}

function fileSignature(record) {
  return `${record.size}:${record.lastModified}`;
}

function getExtension(name) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

function normalizeProjectStatus(value) {
  return ["completed", "complete", "done"].includes(String(value || "").trim().toLowerCase())
    ? "completed"
    : "working";
}

function projectStatusLabel(status) {
  return normalizeProjectStatus(status) === "completed" ? "制作完成" : "正在制作";
}

function stripExtension(name) {
  return name.replace(/\.[^.]+$/, "");
}

function humanize(value) {
  return value.replace(/[-_]+/g, " ");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatMillimeters(value) {
  if (!Number.isFinite(value)) return "—";
  return value >= 100 ? value.toFixed(1) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatInteger(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HANDLE_STORE)) {
        request.result.createObjectStore(HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveHandle(key, handle) {
  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(HANDLE_STORE, "readwrite");
      transaction.objectStore(HANDLE_STORE).put(handle, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch (error) {
    console.warn("Unable to save directory handle", error);
  }
}

async function loadHandle(key) {
  const database = await openDatabase();
  const handle = await new Promise((resolve, reject) => {
    const transaction = database.transaction(HANDLE_STORE, "readonly");
    const request = transaction.objectStore(HANDLE_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
}
