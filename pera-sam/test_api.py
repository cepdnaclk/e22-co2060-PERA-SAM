import requests

url = "https://perasam-backend.blackplant-6bc12ea8.southeastasia.azurecontainerapps.io/analyze"

# We will create a dummy wave file in memory
# A simple 1-second 16kHz mono wave file is just header + bytes, but for testing, let's write a simple file.
import numpy as np
import scipy.io.wavfile as wav

fs = 16000
t = np.linspace(0, 5, fs * 5) # 5 seconds
# Sine wave
data = np.sin(2 * np.pi * 440 * t)
wav.write("temp_test.wav", fs, data.astype(np.float32))

files = {'file': open('temp_test.wav', 'rb')}
data = {'category': 'fan', 'machine_id': '00'}

try:
    print("Sending POST request to /analyze...")
    response = requests.post(url, files=files, data=data)
    print("Status code:", response.status_code)
    print("Response headers:", response.headers)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)
finally:
    import os
    if os.path.exists("temp_test.wav"):
        os.remove("temp_test.wav")
