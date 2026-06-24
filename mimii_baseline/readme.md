## Prerequisites
Before running the baseline code, ensure you have the following installed on your system:
* **Python:** Version 3.8 to 3.10 is highly recommended for compatibility with the required Machine Learning libraries (TensorFlow/Keras).
* **Pip:** Python's package installer.
* **7-Zip:** Required if you plan to use the dataset extraction script on Windows (for extracting `.zip` files).

## Quick setup instructions to install project dependencies locally.

Windows (PowerShell)
--------------------

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
. .venv\Scripts\Activate.ps1
```

If activation is blocked, run as admin or set execution policy:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

2. Upgrade pip and install requirements:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Windows (Command Prompt)
------------------------

```cmd
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Notes
-----
- Recommended Python versions: 3.8–3.10 for best compatibility with older packages.
- The `requirements.txt` in this repo was loosened to avoid strict pins; some packages
  (notably TensorFlow) may still require an older Python. If you need the original
  environment (TensorFlow 1.15), create a virtualenv with Python 3.7/3.8 and install
  the pinned packages instead.

# MIMII dataset baseline (Ver.1.0.3)

This sample code is a baseline of anomaly detection for MIMII dataset.

The MIMII Dataset is a sound dataset for malfunctioning industrial machine investigation and inspection. It contains the sounds generated from four types of industrial machines, i.e. valves, pumps, fans, and slide rails. Each type of machine includes multiple individual product models, and the data for each model contains normal and anomalous sounds. To resemble a real-life scenario, various anomalous sounds were recorded. Also, the background noise recorded in multiple real factories was mixed with the machine sounds. 

The MIMII Dataset can be downloaded at: https://zenodo.org/record/3384388

## Usage

### 1. unzip dataset

Please download .zip files from ZENODO (https://zenodo.org/record/3384388).  
After downloading, .zip files locate under "./dataset" directory.

```
$ cd dataset/
$ sh 7z.sh
$ cd ..
```

**7z.sh** only support Ubuntu 16.04 LTS and 18.04 LTS.
If you use Windows or Cent OS, please edit the scripts.

### 2. run baseline system

```
$ python3.6 baseline.py
```
DAE (Deep AutoEncoder) based anomaly detection will run.  
**model/**, **pickle/**, and **result/** directories will be genetrated.  
When you want to change the parameter, please edit **baseline.yaml**.

- model/ :  
	Training results are located.  
- pickle/ :  
  Snapshots of the dataset are located.  
- result/ :  
	.yaml file (default = result.yaml) is located.  
	In the file, all result AUCs are written.

### 3. sample result
```yaml  
fan_id_00_0dB:
  AUC: 0.6339126707677076
fan_id_00_6dB:
  AUC: 0.7445864448321451
fan_id_00_min6dB:
  AUC: 0.5757112931560107
fan_id_02_0dB:
  AUC: 0.8564412132121879
fan_id_02_6dB:
  AUC: 0.9930556094381638
fan_id_02_min6dB:
  AUC: 0.6401486642716925
fan_id_04_0dB:
  AUC: 0.7304465583300304
fan_id_04_6dB:
  AUC: 0.8688647773814242
fan_id_04_min6dB:
  AUC: 0.5715005284713965
fan_id_06_0dB:
  AUC: 0.982144090361492
fan_id_06_6dB:
  ...
```

