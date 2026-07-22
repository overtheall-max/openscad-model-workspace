// Keep direct file:// launches from reusing an outdated viewer bundle.
const viewerScript = document.createElement("script");
viewerScript.src = `app/viewer.bundle.js?cache=${Date.now()}`;
viewerScript.async = false;
document.head.append(viewerScript);
