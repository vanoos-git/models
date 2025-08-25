async function getSelectedValue() {
 var selectedValue = select.options[select.selectedIndex].value;
 document.getElementById("Header").innerHTML = selectedValue;
 const modelViewer = document.getElementById('modelviewer');
 modelViewer.src="./models/"+selectedValue+".glb";
}

 let select = document.createElement('select');//document.getElementById('listPicker');
select.addEventListener("change", getSelectedValue);
select.setAttribute('style', 'margin-top:25px;');
 parent= document.getElementById('parent');
parent.prepend(select);

async function loadFile() {
 select.setAttribute("id", "listPicker");
 await fetch('https://vanoos.ucoz.net/file.txt') // загрузка файла file.txt
 .then(response => response.text())
 .then(data => {
 let lines = data.split(/\r?\n/); // разбиваем на строки по новой строке
 lines.forEach(line => {
 if(line.trim()) { // пропускаем пустые строки
 const option = document.createElement('option');
 option.value = line;
 option.textContent = line;
 select.appendChild(option);
 }
 });
 })
 .catch(error => console.error('Ошибка при загрузке файла:', error));
}


 let modelViewer;
 let window_state = {
 isModelLoaded: false,
 isHidden: false,
 savedMaterials: null,
 savedExposure: null
 };

 document.addEventListener('DOMContentLoaded', async () => {
 await loadFile();
 await getSelectedValue();
 modelViewer = document.getElementById('modelviewer');
 // 等待模型加载完成
 modelViewer.addEventListener('load', () => {

 console.log('Model loaded, materials available:', modelViewer.model.materials.length);
 window_state.isModelLoaded = true;
 
 // 调试：打印材质信息
 modelViewer.model.materials.forEach((mat, idx) => {
 console.log(`Material ${idx}:`, {
 name: mat.name,
 hasBaseColor: !!mat.pbrMetallicRoughness.baseColorTexture,
 hasMetallicRoughness: !!mat.pbrMetallicRoughness.metallicRoughnessTexture,
 hasNormal: !!mat.normalTexture
 });
 });
 });

 modelViewer.addEventListener('error', (event) => {
 console.error('Model loading error:', event);
 });
 });

 function ensureModelLoaded() {
 if (!window_state.isModelLoaded || !modelViewer.model || !modelViewer.model.materials) {
 console.warn('Model not loaded yet');
 return false;
 }
 return true;
 }

 function saveMaterialsState() {
 if (!ensureModelLoaded()) return false;
 
 console.log('Saving materials state...');
 window_state.savedMaterials = [];
 window_state.savedExposure = modelViewer.exposure;
 
 for (let i = 0; i < modelViewer.model.materials.length; i++) {
 const material = modelViewer.model.materials[i];
 const pbr = material.pbrMetallicRoughness;
 
 const materialState = {
 baseColorTexture: null,
 metallicRoughnessTexture: null,
 normalTexture: null,
 baseColorFactor: null,
 metallicFactor: null,
 roughnessFactor: null
 };
 
 // 保存纹理引用
 try {
 if (pbr.baseColorTexture && pbr.baseColorTexture.texture) {
 materialState.baseColorTexture = pbr.baseColorTexture.texture;
 console.log(`Saved baseColorTexture for material ${i}`);
 }
 if (pbr.metallicRoughnessTexture && pbr.metallicRoughnessTexture.texture) {
 materialState.metallicRoughnessTexture = pbr.metallicRoughnessTexture.texture;
 console.log(`Saved metallicRoughnessTexture for material ${i}`);
 }
 if (material.normalTexture && material.normalTexture.texture) {
 materialState.normalTexture = material.normalTexture.texture;
 console.log(`Saved normalTexture for material ${i}`);
 }
 
 // 保存材质参数
 materialState.baseColorFactor = [...pbr.baseColorFactor];
 materialState.metallicFactor = pbr.metallicFactor;
 materialState.roughnessFactor = pbr.roughnessFactor;
 
 } catch (error) {
 console.error(`Error saving material ${i}:`, error);
 }
 
 window_state.savedMaterials.push(materialState);
 }
 
 console.log('Materials state saved:', window_state.savedMaterials);
 return true;
 }

 function hideTexture() {
 console.log('hideTexture called');
 
 if (!ensureModelLoaded()) {
 console.error('Cannot hide texture: model not loaded');
 return;
 }
 
 let appearanceButton = document.getElementById('appearance-button');
 let geometryButton = document.getElementById('geometry-button');
 appearanceButton.classList.remove('checked');
 geometryButton.classList.add('checked');
 
 // 如果已经隐藏，直接返回
 if (window_state.isHidden) return;
 
 // 第一次隐藏时保存状态
 if (!window_state.savedMaterials) {
 if (!saveMaterialsState()) return;
 }
 
 // 隐藏所有纹理
 try {
 for (let i = 0; i < modelViewer.model.materials.length; i++) {
 const material = modelViewer.model.materials[i];
 const pbr = material.pbrMetallicRoughness;
 
 if (pbr.baseColorTexture) {
 pbr.baseColorTexture.setTexture(null);
 }
 if (pbr.metallicRoughnessTexture) {
 pbr.metallicRoughnessTexture.setTexture(null);
 }
 if (material.normalTexture) {
 material.normalTexture.setTexture(null);
 }
 }
 
 window_state.isHidden = true;
 modelViewer.environmentImage = '/static/env_maps/gradient.jpg';
 modelViewer.exposure = 4;
 
 console.log('Textures hidden successfully');
 } catch (error) {
 console.error('Error hiding textures:', error);
 }
 }

 function showTexture() {
 console.log('showTexture called');
 
 if (!ensureModelLoaded()) {
 console.error('Cannot show texture: model not loaded');
 return;
 }
 
 let appearanceButton = document.getElementById('appearance-button');
 let geometryButton = document.getElementById('geometry-button');
 appearanceButton.classList.add('checked');
 geometryButton.classList.remove('checked');
 
 // 如果不在隐藏状态，直接返回
 if (!window_state.isHidden) return;
 
 // 如果没有保存的材质状态，无法恢复
 if (!window_state.savedMaterials) {
 console.warn('No saved materials to restore');
 return;
 }
 
 // 恢复纹理
 try {
 for (let i = 0; i < modelViewer.model.materials.length && i < window_state.savedMaterials.length; i++) {
 const material = modelViewer.model.materials[i];
 const pbr = material.pbrMetallicRoughness;
 const savedMaterial = window_state.savedMaterials[i];
 
 // 恢复纹理
 if (savedMaterial.baseColorTexture && pbr.baseColorTexture) {
 pbr.baseColorTexture.setTexture(savedMaterial.baseColorTexture);
 console.log(`Restored baseColorTexture for material ${i}`);
 }
 if (savedMaterial.metallicRoughnessTexture && pbr.metallicRoughnessTexture) {
 pbr.metallicRoughnessTexture.setTexture(savedMaterial.metallicRoughnessTexture);
 console.log(`Restored metallicRoughnessTexture for material ${i}`);
 }
 if (savedMaterial.normalTexture && material.normalTexture) {
 material.normalTexture.setTexture(savedMaterial.normalTexture);
 console.log(`Restored normalTexture for material ${i}`);
 }
 
 // 恢复材质参数
 if (savedMaterial.baseColorFactor) {
 pbr.setBaseColorFactor(savedMaterial.baseColorFactor);
 }
 if (typeof savedMaterial.metallicFactor === 'number') {
 pbr.setMetallicFactor(savedMaterial.metallicFactor);
 }
 if (typeof savedMaterial.roughnessFactor === 'number') {
 pbr.setRoughnessFactor(savedMaterial.roughnessFactor);
 }
 }
 
 // 恢复环境设置
 modelViewer.environmentImage = '/static/env_maps/white.jpg';
 if (window_state.savedExposure !== undefined) {
 modelViewer.exposure = window_state.savedExposure;
 }
 
 window_state.isHidden = false;
 console.log('Textures restored successfully');
 
 } catch (error) {
 console.error('Error restoring textures:', error);
 }
 }

 // 添加调试函数
 function debugMaterials() {
 if (!ensureModelLoaded()) return;
 
 console.log('=== Current Materials Debug ===');
 modelViewer.model.materials.forEach((mat, idx) => {
 const pbr = mat.pbrMetallicRoughness;
 console.log(`Material ${idx}:`, {
 name: mat.name,
 baseColorTexture: pbr.baseColorTexture?.texture || null,
 metallicRoughnessTexture: pbr.metallicRoughnessTexture?.texture || null,
 normalTexture: mat.normalTexture?.texture || null,
 baseColorFactor: pbr.baseColorFactor,
 metallicFactor: pbr.metallicFactor,
 roughnessFactor: pbr.roughnessFactor
 });
 });
 console.log('Window state:', window_state);
 console.log('===============================');
 }

 // 暴露调试函数到全局
 window.debugMaterials = debugMaterials;