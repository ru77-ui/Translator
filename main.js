// 🔑 Groq API Key
const GROQ_API_KEY = "gsk_EHX6PNeaacWGdyb3FYD8o8sj8NVKu4ob2wbHRW5iJFs";

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// 🎙️ 録音の「開始 / 停止」を1つのボタンで切り替えるトグル関数
async function toggleRecognition() {
  if (isRecording) {
    stopRecognition();
  } else {
    await startRecognition();
  }
}

// 🚀 録音開始（高感度マイク設定）
async function startRecognition() {
  const btn = document.getElementById("status-btn");
  const status = document.getElementById("status");

  try {
    // どんな声（低音・高音・囁き）でも拾う高感度マイクストリームを取得
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true // 自動音量増幅（低い声もブースト）
      }
    });

    // 高音質かつ軽量なwebm形式で録音
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = ''; // ブラウザデフォルト
    }

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    audioChunks = [];

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0 && isRecording) {
        const audioBlob = new Blob([event.data], { type: event.data.type || 'audio/webm' });
        
        // 低音・短文でも検出できるようにサイズ制限を緩和 (1KB以上で送信)
        if (audioBlob.size > 1000) {
          await processAudioWithWhisper(audioBlob);
        }
      }
    };

    // 2.0秒ごとに音声パケットを切って超高速レスポンス
    mediaRecorder.start(2000);
    isRecording = true;

    // UIの切り替え（赤色の停止ボタン化）
    if (btn) {
      btn.innerText = "🛑 録音を停止する";
      btn.style.background = "#ff4444";
      btn.style.color = "#ffffff";
    }
    if (status) {
      status.innerText = "🎙️ マイク起動中・音声検知中...";
      status.style.color = "#39ff14";
    }

  } catch (err) {
    alert("マイクの起動に失敗しました。アクセスを許可してください: " + err.message);
  }
}

// ⏹️ 録音停止
function stopRecognition() {
  isRecording = false;

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  const btn = document.getElementById("status-btn");
  const status = document.getElementById("status");

  if (btn) {
    btn.innerText = "🎙️ Whisper AIキャッチ開始";
    btn.style.background = "#00e5ff";
    btn.style.color = "#000000";
  }
  if (status) {
    status.innerText = "待機中...";
    status.style.color = "#aaa";
  }
}

// 🧠 高精度 Whisper AI (Groq large-v3) ＆ 日本語同時翻訳
async function processAudioWithWhisper(audioBlob) {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "speech.webm");
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "json");
    formData.append("temperature", "0.0"); // 幻覚・誤認識の抑制
    formData.append("prompt", "Punctuation-rich natural conversation transcript."); // 認識精度補正ヒント

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) return;

    const data = await response.json();
    const transcribedText = data.text ? data.text.trim() : "";

    // 空白や無意味なノイズ（1文字以下）は排除
    if (!transcribedText || transcribedText.length < 2) return;

    // Google Translate API で高速日本語変換
    const query = encodeURIComponent(transcribedText);
    const transRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${query}`);
    const transData = await transRes.json();

    let translatedText = "";
    if (transData && transData[0]) {
      transData[0].forEach(part => { if (part[0]) translatedText += part[0]; });
    }

    if (translatedText) {
      appendLog(transcribedText, translatedText);
    }

  } catch (error) {
    console.error("Whisper処理エラー:", error);
  }
}

// ログ出力関数
function appendLog(original, japanese) {
  const logEl = document.getElementById("log-area");
  if (!logEl) return;

  if (logEl.innerText.includes("待機中")) {
    logEl.innerHTML = "";
  }

  const logItem = document.createElement("div");
  logItem.style.cssText = "margin-bottom: 12px; padding: 10px 14px; background: rgba(255,255,255,0.06); border-left: 4px solid #00e5ff; border-radius: 6px;";
  logItem.innerHTML = `
    <div style="font-size: 13px; color: #bbb; margin-bottom: 4px;">🗣️ ${original}</div>
    <div style="font-size: 16px; color: #39ff14; font-weight: bold;">🇯🇵 ${japanese}</div>
  `;

  logEl.appendChild(logItem);
  logEl.scrollTop = logEl.scrollHeight;
}