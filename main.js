const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true,
      contextIsolation: true,
    },
  });

  win.loadFile("microphone.html");
  win.setMenu(null);
}

// マイクの自動許可と、ネットワーク通信を安定させる設定
app.commandLine.appendSwitch("use-fake-ui-for-media-stream");
app.commandLine.appendSwitch("disable-features", "ChunkedDataPipeUpload");

app.whenReady().then(() => {
  createWindow();
});
