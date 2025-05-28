async function convertToSpeech() {
    const text = document.getElementById('text').value;
    const selectedVoice = document.querySelector('input[name="voice"]:checked');
    const voice = selectedVoice.value;
    const model = selectedVoice.dataset.model;
    const statusDiv = document.getElementById('status');
    const audio = document.getElementById('audio');

    if (!text) {
        statusDiv.className = 'error';
        statusDiv.textContent = '请输入要转换的文本';
        return;
    }

    try {
        statusDiv.className = '';
        statusDiv.textContent = '正在转换...';

        const response = await fetch('https://api.stepfun.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 7hBnDeUWBpI3K2c48hrsYfFgAAY2FCuh9K591JXQfz0BBexoFNMnzN9c19ZMGm4N7'
            },
            body: JSON.stringify({
                model: model,
                input: text,
                voice: voice,
                volume: 1.0,  // 音量，范围 0.1-2.0
                speed: 1.0    // 语速，范围 0.5-2.0
            })
        });

        if (!response.ok) {
            throw new Error('转换失败');
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        audio.src = audioUrl;
        audio.style.display = 'block';
        
        statusDiv.className = 'success';
        statusDiv.textContent = '转换成功！';
    } catch (error) {
        console.error('Error:', error);
        statusDiv.className = 'error';
        statusDiv.textContent = '转换失败：' + error.message;
    }
} 