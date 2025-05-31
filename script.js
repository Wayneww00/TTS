// 检测iOS设备
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// 检测是否为移动设备
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 改进的请求函数，支持重试
async function makeAPIRequest(requestData, retryCount = 0) {
    const maxRetries = 3;
    
    try {
        // 为iOS设备添加额外的请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 7hBnDeUWBpI3K2c48hrsYfFgAAY2FCuh9K591JXQfz0BBexoFNMnzN9c19ZMGm4N7'
        };
        
        // iOS特殊处理
        if (isIOS()) {
            headers['Accept'] = 'audio/mpeg, audio/*, */*';
            headers['Cache-Control'] = 'no-cache';
        }
        
        const response = await fetch('https://api.stepfun.com/v1/audio/speech', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData),
            mode: 'cors', // 明确指定CORS模式
            credentials: 'omit', // 不发送凭据
            referrerPolicy: 'no-referrer'
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '无法获取错误详情');
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        return response;
    } catch (error) {
        console.error(`请求失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        if (retryCount < maxRetries) {
            const delayTime = Math.pow(2, retryCount) * 1000; // 指数退避
            console.log(`等待 ${delayTime}ms 后重试...`);
            await delay(delayTime);
            return makeAPIRequest(requestData, retryCount + 1);
        }
        
        throw error;
    }
}

async function convertToSpeech() {
    const text = document.getElementById('text').value;
    const selectedVoice = document.querySelector('input[name="voice"]:checked');
    const voice = selectedVoice.value;
    const model = selectedVoice.dataset.model;
    const statusDiv = document.getElementById('status');
    const audio = document.getElementById('audio');
    const convertButton = document.querySelector('.convert-button');

    if (!text.trim()) {
        statusDiv.className = 'error';
        statusDiv.textContent = '请输入要转换的文本';
        return;
    }

    // 禁用按钮防止重复点击
    convertButton.disabled = true;
    
    // iOS设备特殊提示
    if (isIOS()) {
        statusDiv.className = '';
        statusDiv.textContent = '正在转换... (iOS设备处理中，请稍候)';
    } else {
        statusDiv.className = '';
        statusDiv.textContent = '正在转换...';
    }

    try {
        // 检查网络连接
        if (!navigator.onLine) {
            throw new Error('网络连接断开，请检查网络设置');
        }
        
        // 构建请求数据
        const requestData = {
            model: model,
            input: text.trim(),
            voice: voice,
            volume: 1.0,
            speed: 1.0,
            response_format: 'mp3'
        };
        
        console.log('发送请求:', requestData);
        
        // 发送API请求
        const response = await makeAPIRequest(requestData);
        
        console.log('响应状态:', response.status, response.statusText);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));
        
        // 检查响应内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('audio')) {
            console.warn('意外的内容类型:', contentType);
        }
        
        const blob = await response.blob();
        console.log('Blob信息:', { size: blob.size, type: blob.type });
        
        // 检查blob是否有效
        if (blob.size === 0) {
            throw new Error('返回的音频文件为空，请重试');
        }
        
        if (blob.size < 100) {
            throw new Error('音频文件异常小，可能转换失败');
        }

        // 为iOS设备优化音频处理
        if (isIOS()) {
            // 创建新的audio元素以确保iOS兼容性
            const newAudio = new Audio();
            
            // 设置音频属性
            newAudio.controls = true;
            newAudio.preload = 'metadata'; // 改为metadata，减少资源占用
            newAudio.style.width = '100%';
            newAudio.crossOrigin = 'anonymous'; // 设置跨域属性
            
            // 创建blob URL
            const audioUrl = URL.createObjectURL(blob);
            console.log('创建音频URL:', audioUrl);
            
            // 设置音频源
            newAudio.src = audioUrl;
            
            // 替换现有的audio元素
            const oldAudio = document.getElementById('audio');
            oldAudio.parentNode.replaceChild(newAudio, oldAudio);
            newAudio.id = 'audio';
            newAudio.style.display = 'block';
            
            // 添加事件监听器
            newAudio.addEventListener('loadstart', () => {
                console.log('开始加载音频');
                statusDiv.className = '';
                statusDiv.textContent = '音频加载中...';
            });
            
            newAudio.addEventListener('loadedmetadata', () => {
                console.log('音频元数据加载完成');
                statusDiv.className = '';
                statusDiv.textContent = '音频准备中...';
            });
            
            newAudio.addEventListener('canplay', () => {
                console.log('音频可以播放');
                statusDiv.className = 'success';
                statusDiv.textContent = '转换成功！点击播放按钮播放音频';
            });
            
            newAudio.addEventListener('canplaythrough', () => {
                console.log('音频完全加载');
                statusDiv.className = 'success';
                statusDiv.textContent = '转换成功！音频已准备就绪';
            });
            
            newAudio.addEventListener('error', (e) => {
                console.error('音频播放错误:', e, newAudio.error);
                statusDiv.className = 'error';
                if (newAudio.error) {
                    switch(newAudio.error.code) {
                        case newAudio.error.MEDIA_ERR_ABORTED:
                            statusDiv.textContent = '音频播放被中止';
                            break;
                        case newAudio.error.MEDIA_ERR_NETWORK:
                            statusDiv.textContent = '网络错误导致音频播放失败';
                            break;
                        case newAudio.error.MEDIA_ERR_DECODE:
                            statusDiv.textContent = '音频解码失败';
                            break;
                        case newAudio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            statusDiv.textContent = '音频格式不支持';
                            break;
                        default:
                            statusDiv.textContent = '音频播放失败，请检查设备设置';
                    }
                } else {
                    statusDiv.textContent = '音频播放失败，请检查设备音频设置';
                }
            });
            
            // 尝试加载音频
            newAudio.load();
            
            // 清理旧的blob URL
            setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
                console.log('清理音频URL');
            }, 300000); // 5分钟后清理
            
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
            }, 300000);
        }

    } catch (error) {
        console.error('转换错误:', error);
        statusDiv.className = 'error';
        
        // 根据不同错误类型提供不同的错误信息
        let errorMessage = '';
        
        if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
            if (isIOS()) {
                errorMessage = 'iOS网络请求失败，请检查：1) 网络连接 2) 是否使用HTTPS 3) 尝试刷新页面';
            } else {
                errorMessage = '网络请求失败，请检查网络连接';
            }
        } else if (error.message.includes('CORS')) {
            errorMessage = '跨域请求被阻止，请尝试刷新页面';
        } else if (error.message.includes('HTTP 4')) {
            errorMessage = '请求参数错误，请重试';
        } else if (error.message.includes('HTTP 5')) {
            errorMessage = '服务器错误，请稍后重试';
        } else if (error.message.includes('网络连接断开')) {
            errorMessage = '网络连接断开，请检查网络设置后重试';
        } else if (isIOS() && error.message.includes('播放')) {
            errorMessage = '音频播放失败，请确保设备未静音且允许音频播放';
        } else {
            errorMessage = `转换失败：${error.message}`;
        }
        
        statusDiv.textContent = errorMessage;
        
        // 为iOS用户提供额外的解决建议
        if (isIOS()) {
            setTimeout(() => {
                if (statusDiv.className === 'error') {
                    statusDiv.innerHTML = errorMessage + '<br><small>iOS用户建议：尝试关闭其他应用，刷新页面，或切换到WiFi网络</small>';
                }
            }, 2000);
        }
    } finally {
        // 重新启用按钮
        convertButton.disabled = false;
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
        
        console.log('iOS设备检测成功，已应用特殊优化');
    }
    
    // 监听网络状态变化
    window.addEventListener('online', () => {
        console.log('网络连接已恢复');
    });
    
    window.addEventListener('offline', () => {
        console.log('网络连接已断开');
    });
}); 
