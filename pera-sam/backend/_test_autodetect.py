import sys, os
sys.path.insert(0, r'd:/Eng Aca_ Computer Engineering/3 rd sem/2yp/test/Model/server')
from inference import SoundAnalyzer

DATASET = r'd:\Eng Aca_ Computer Engineering\3 rd sem\2yp\test\mimii_baseline\dataset\0dB\0_dB_fan\fan'
analyzer = SoundAnalyzer()

# Test Auto-Detection (passing machine_id=None)
tests = [
    (DATASET + r'\id_06\normal\00000000.wav',   'fan', 'Normal id_06 (should detect 06)'),
    (DATASET + r'\id_06\abnormal\00000000.wav', 'fan', 'Abnormal id_06 (should detect 06)'),
    (DATASET + r'\id_00\normal\00000000.wav',   'fan', 'Normal id_00 (should detect 00)'),
    (DATASET + r'\id_02\abnormal\00000000.wav', 'fan', 'Abnormal id_02 (should detect 02)'),
]

print("Running AUTO-DETECTION tests...")
for path, cat, label in tests:
    r = analyzer.predict(path, category=cat, machine_id=None) # machine_id=None triggers auto-detect
    print(f'{label:40s}: Detected={r["machine_id"]}  Status={r["status"]:8s}  Score={r["score"]:.3f}  Threshold={r["threshold_used"]}')
