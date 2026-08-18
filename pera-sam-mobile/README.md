# PERA-SAM Mobile

Expo app for acoustic machine analysis, repair requests, and analysis history.

## Configure services

Copy `.env.example` to `.env` and replace the Supabase placeholders with your project URL and anon key.

For an iPhone, the ML backend cannot use `localhost`. Set the API URL to the Wi-Fi IPv4 address of the computer running the backend:

```env
EXPO_PUBLIC_ML_API_URL=http://192.168.1.10:8000
```

Run the backend from `pera-sam/backend` with Python 3.12 or earlier (TensorFlow 2.17 does not support the installed Python 3.14):

```powershell
py -3.12 -m pip install -r requirements.txt
py -3.12 main.py
```

Allow port `8000` through Windows Firewall and keep the phone and computer on the same Wi-Fi.

## Run the app

```powershell
cd "D:\pera sam\e22-co2060-PERA-SAM\pera-sam-mobile"
npm install
npx expo start --clear
```

Open Expo Go on the iPhone and scan the QR code. Restart Expo whenever `.env` changes.
