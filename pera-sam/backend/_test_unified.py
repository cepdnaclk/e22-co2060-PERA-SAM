import sys, os
sys.path.insert(0, r'd:/Eng Aca_ Computer Engineering/3 rd sem/2yp/test/Model/server')

import yaml

# Test 1: Config loads
with open(r'd:/Eng Aca_ Computer Engineering/3 rd sem/2yp/test/Model/server/config.yaml') as f:
    cfg = yaml.safe_load(f)
print('Config loaded:', list(cfg.keys()))

# Test 2: Trainer initialises
from trainer import MIMIITrainer
ASSETS = r'd:/Eng Aca_ Computer Engineering/3 rd sem/2yp/test/Model/server/assets'
trainer = MIMIITrainer(cfg, ASSETS)
print('MIMIITrainer initialized')
print('  Dataset base:', trainer.base_dir)
print('  Dataset exists:', os.path.exists(trainer.base_dir))
print('  Needs training:', trainer.needs_training())

# Test 3: Inference engine loads
from inference import SoundAnalyzer
analyzer = SoundAnalyzer()
model_count = sum(len(ids) for ids in analyzer.models.values() if isinstance(ids, dict))
print('SoundAnalyzer loaded', model_count, 'models')

# Test 4: Quick predict
DATASET = r'd:\Eng Aca_ Computer Engineering\3 rd sem\2yp\test\mimii_baseline\dataset\0dB\0_dB_fan\fan'
r = analyzer.predict(DATASET + r'\id_06\abnormal\00000000.wav', category='fan', machine_id='06')
print('Predict fan_id_06 abnormal: Status=' + r['status'] + '  Score=' + str(round(r['score'],3)) + '  Threshold=' + str(r['threshold_used']))

r2 = analyzer.predict(DATASET + r'\id_06\normal\00000000.wav', category='fan', machine_id='06')
print('Predict fan_id_06 normal:   Status=' + r2['status'] + '  Score=' + str(round(r2['score'],3)) + '  Threshold=' + str(r2['threshold_used']))
