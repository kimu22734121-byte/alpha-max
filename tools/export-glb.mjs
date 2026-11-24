// js/models/builders.js のモデルを models/*.glb に書き出す
// 使い方: npm install && npm run models
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { MODEL_BUILDERS, buildModel } from '../js/models/builders.js';

// Node には FileReader が無いので最低限を用意
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => { this.result = buf; this.onload?.({ target: this }); this.onloadend?.({ target: this }); });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`;
        this.onload?.({ target: this }); this.onloadend?.({ target: this });
      });
    }
  };
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'models');
mkdirSync(outDir, { recursive: true });

const exporter = new GLTFExporter();
const manifest = [];
let total = 0;
for (const id of Object.keys(MODEL_BUILDERS)) {
  const obj = buildModel(id);
  const scene = new THREE.Scene();
  scene.add(obj);
  const glb = await exporter.parseAsync(scene, { binary: true, onlyVisible: true });
  const buf = Buffer.from(glb);
  writeFileSync(join(outDir, `${id}.glb`), buf);
  manifest.push(id);
  total += buf.length;
  console.log(`models/${id}.glb  ${(buf.length / 1024).toFixed(1)} KB`);
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ models: manifest }, null, 2) + '\n');
console.log(`合計 ${manifest.length} 個 / ${(total / 1024).toFixed(1)} KB`);
