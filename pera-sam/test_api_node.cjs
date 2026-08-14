const fs = require('fs');

async function run() {
  const url = "https://perasam-backend.blackplant-6bc12ea8.southeastasia.azurecontainerapps.io/analyze";

  // Create a minimal valid WAV file header:
  // RIFF (4 bytes), file size (4 bytes), WAVE (4 bytes), fmt  (4 bytes), fmt chunk size (4 bytes),
  // audio format (2 bytes), num channels (2 bytes), sample rate (4 bytes), byte rate (4 bytes),
  // block align (2 bytes), bits per sample (2 bytes), data (4 bytes), data size (4 bytes)
  // Let's create a 1-second 16000Hz mono 16-bit PCM WAV file:
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const duration = 5; // 5 seconds to satisfy "Audio too short for analysis"
  const numSamples = sampleRate * duration;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  // Generate a simple 440Hz sine wave
  const data = Buffer.alloc(dataSize);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const value = Math.round(32767 * Math.sin(2 * Math.PI * 440 * t));
    data.writeInt16LE(value, i * 2);
  }

  const wavBuffer = Buffer.concat([header, data]);
  fs.writeFileSync('temp_node.wav', wavBuffer);

  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', fs.createReadStream('temp_node.wav'));
  form.append('category', 'fan');
  form.append('machine_id', '00');

  try {
    console.log("Sending POST request to /analyze via Node...");
    const response = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });
    console.log("Status code:", response.status);
    const json = await response.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    if (fs.existsSync('temp_node.wav')) {
      fs.unlinkSync('temp_node.wav');
    }
  }
}

run();
