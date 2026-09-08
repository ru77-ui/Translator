// 🔑 Groq APIキー設定済み
const GROQ_API_KEY = "gsk_EHX6PNeaacWGdyb3FYD8o8sj8NVKu4ob2wbHRW5iJFs";

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const statusEl = document.getElementById("status-btn");
const logEl = document.getElementById("log-area");

// 🎙️ 音声キャッチ＆Whisper AI処理の開始
async function startRecognition() {
  if (!GROQ_API_KEY || GROQ_API_KEY.includes("ここにAPIキー")) {
    alert("APIキーが正しく設定されていません。");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = []; // バッファリセット
        
        // 微小ノイズ（短すぎる音声）はスキップ
        if (audioBlob.size > 3000) { 
          await processAudioWithWhisper(audioBlob);
        }
      }
    };

    // 2.5秒ごとに音声を区切ってGroqへ高速送信
    mediaRecorder.start(2500); 
    isRecording = true;

    if (statusEl) {
      statusEl.innerText = "🎙️ Whisper AI (99%超高精度モード) 稼働中...";
      statusEl.disabled = true;
      statusEl.style.background = "#222";
    }
    
    if (logEl) {
      logEl.style.maxHeight = "400px";
      logEl.style.overflowY = "auto";
      logEl.innerHTML = "<div style='color: #888;'>Whisper AIが待機中... 話しかけるとログが下に溜まります</div>";
    }

  } catch (err) {
    alert("マイクの起動に失敗しました: " + err.message);
  }
}

// 🧠 Whisper AI (Groq) で文脈補正テキスト化 ＆ 日本語へ超高速翻訳
async function processAudioWithWhisper(audioBlob) {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "json");

    // 1. Groq Whisper APIへ音声送信
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

    // 意味のない単語やノイズをフィルタリング
    if (!transcribedText || transcribedText.length < 2) return;

    // 2. 自動言語検知 ＆ 超高速日本語翻訳
    const query = encodeURIComponent(transcribedText);
    const transRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${query}`);
    const transData = await transRes.json();
    
    let translatedText = "";
    if (transData && transData[0]) {
      transData[0].forEach(part => { if (part[0]) translatedText += part[0]; });
    }

    if (!translatedText) return;

    // 3. ログを下部へ追記
    appendLog(transcribedText, translatedText);

  } catch (error) {
    console.error("Whisper処理エラー:", error);
  }
}

// 画面下部へチャットログ風に追加する関数
function appendLog(original, japanese) {
  if (!logEl) return;

  const logItem = document.createElement("div");
  logItem.style.cssText = "margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.05); border-left: 3px solid #00e5ff; border-radius: 4px;";
  logItem.innerHTML = `
    <div style="font-size: 13px; color: #aaa; margin-bottom: 2px;">🗣️ ${original}</div>
    <div style="font-size: 17px; color: #39ff14; font-weight: bold;">🇯🇵 ${japanese}</div>
  `;

  if (logEl.innerText.includes("待機中")) {
    logEl.innerHTML = "";
  }

  logEl.appendChild(logItem);
  logEl.scrollTop = logEl.scrollHeight; // 自動スクロール
}