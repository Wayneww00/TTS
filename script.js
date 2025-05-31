// 检测iOS设备
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// 检测是否为移动设备
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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

    // iOS设备特殊提示
    if (isIOS()) {
        statusDiv.className = '';
        statusDiv.textContent = '正在转换... (iOS设备请确保允许音频播放)';
    } else {
        statusDiv.className = '';
        statusDiv.textContent = '正在转换...';
    }

    try {
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
                volume: 1.0,
                speed: 1.0,
                response_format: 'mp3'  // 明确指定音频格式
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`转换失败: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        
        // 检查blob是否有效
        if (blob.size === 0) {
            throw new Error('返回的音频文件为空');
        }

        // 为iOS设备优化音频处理
        if (isIOS()) {
            // 创建新的audio元素以确保iOS兼容性
            const newAudio = new Audio();
            
            // 设置音频属性
            newAudio.controls = true;
            newAudio.preload = 'auto';
            newAudio.style.width = '100%';
            
            // 创建blob URL
            const audioUrl = URL.createObjectURL(blob);
            newAudio.src = audioUrl;
            
            // 替换现有的audio元素
            const oldAudio = document.getElementById('audio');
            oldAudio.parentNode.replaceChild(newAudio, oldAudio);
            newAudio.id = 'audio';
            newAudio.style.display = 'block';
            
            // iOS需要用户交互才能播放音频，所以我们尝试自动播放
            newAudio.load();
            
            // 添加事件监听器
            newAudio.addEventListener('canplaythrough', () => {
                statusDiv.className = 'success';
                statusDiv.textContent = '转换成功！点击播放按钮播放音频';
            });
            
            newAudio.addEventListener('error', (e) => {
                console.error('音频播放错误:', e);
                statusDiv.className = 'error';
                statusDiv.textContent = '音频播放失败，请检查设备音频设置';
            });
            
            // 清理旧的blob URL
            setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
            }, 60000); // 1分钟后清理
            
        } else {
            // 非iOS设备的处理方式
            const audioUrl = URL.createObjectURL(blob);
            audio.src = audioUrl;
            audio.style.display = 'block';
            audio.load();
            
            statusDiv.className = 'success';
            statusDiv.textContent = '转换成功！';
            
            // 清理blob URL
            setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
            }, 60000);
        }

    } catch (error) {
        console.error('Error:', error);
        statusDiv.className = 'error';
        
        // 根据不同错误类型提供不同的错误信息
        if (error.message.includes('网络')) {
            statusDiv.textContent = '网络连接失败，请检查网络连接';
        } else if (error.message.includes('CORS')) {
            statusDiv.textContent = '跨域请求失败，请检查网络环境';
        } else if (isIOS() && error.message.includes('播放')) {
            statusDiv.textContent = '音频播放失败，请确保设备未静音且允许音频播放';
        } else {
            statusDiv.textContent = '转换失败：' + error.message;
        }
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 如果是移动设备，添加触摸优化
    if (isMobile()) {
        document.body.style.webkitTouchCallout = 'none';
        document.body.style.webkitUserSelect = 'none';
    }
    
    // 为iOS设备添加特殊说明和显示提示
    if (isIOS()) {
        const subtitle = document.querySelector('.subtitle');
        if (subtitle) {
            subtitle.textContent += ' (iOS设备请确保设备未静音)';
        }
        
        // 显示iOS提示
        const iosNotice = document.getElementById('ios-notice');
        if (iosNotice) {
            iosNotice.style.display = 'block';
        }
    }
}); 
