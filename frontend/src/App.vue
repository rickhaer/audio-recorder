<template>
    <section class="bg-black h-dvh w-full text-white flex justify-center items-center">
        <div
            class="w-[90dvw] h-[80dvh] lg:w-[60dvw] lg:h-[70dvh] bg-white rounded-3xl p-8 flex flex-col items-center gap-8 text-black">
            <div class="flex flex-col items-center gap-2">
                <h1 class="text-2xl font-bold text-center">Recorder<br />Ricardo Häringer</h1>
            </div>
            <div class="flex flex-col gap-2 items-center">
                <button
                    @click="toggleRecording"
                    class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
                    :class="isRecording ? 'bg-red-600' : 'bg-red-600 hover:scale-110'">
                    <div
                        class="border-4 border-white transition-all duration-300"
                        :class="[isRecording ? 'w-8 h-8' : 'w-16 h-16 rounded-full']"></div>
                </button>

                <!-- Timer  -->
                <div class="text-xl font-mono" v-if="isRecording">
                    {{ formatTime(timer) }}
                </div>
                <div class="text-xl font-mono" v-else>00:00</div>
            </div>
            <!-- Recording -->
            <div class="w-full max-w-md flex flex-col gap-4">
                <div v-if="recording" class="flex flex-col gap-2">
                    <div class="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
                        <button
                            @click="togglePlayback"
                            class="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white transition-all duration-300 hover:scale-110">
                            <div
                                v-if="!isPlaying || isPaused"
                                class="w-0 h-0 border-l-[10px] border-l-white border-y-[7px] border-y-transparent ml-1"></div>
                            <div v-else class="w-[14px] h-[14px] border-r-[3px] border-l-[3px] border-white"></div>
                        </button>
                        <span>Recording - {{ formatTime(recording.duration) }}</span>
                    </div>

                    <div class="flex flex-col gap-2">
                        <input
                            type="email"
                            v-model="email"
                            placeholder="Enter your email"
                            class="p-2 border rounded-lg outline-none transition-colors"
                            :class="{
                                'border-red-500': !isValidEmail && email !== '',
                                'border-green-500': isValidEmail && email !== ''
                            }" />
                        <button
                            @click="transformRecording"
                            :disabled="!isValidEmail || isLoading"
                            class="bg-black text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            <span v-if="!isLoading">Transform Recording</span>
                            <span v-else>Processing...</span>
                        </button>
                    </div>

                    <!-- Transformed recording -->
                    <div v-if="transformedRecording" class="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
                        <button
                            @click="toggleTransformedPlayback"
                            class="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white transition-colors">
                            <div
                                v-if="!isTransformedPlaying || isTransformedPaused"
                                class="w-0 h-0 border-l-[10px] border-l-white border-y-[7px] border-y-transparent ml-1"></div>
                            <div v-else class="w-[14px] h-[14px] border-r-[3px] border-l-[3px] border-white"></div>
                        </button>
                        <span>Transformed recording - {{ formatTime(transformedRecording.duration) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref, onUnmounted, onMounted, computed } from 'vue';

const isRecording = ref(false);
const mediaRecorder = ref(null);
const audioChunks = ref([]);
const timer = ref(0);
let timerInterval;

// format time for display
const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const recording = ref(null);
const audioPlayer = new Audio();

const isPlaying = ref(false);
const playbackPosition = ref(0);
const isPaused = ref(false);

// toggle function to play and pause recording
const togglePlayback = () => {
    if (isPlaying.value) {
        if (audioPlayer.paused) {
            audioPlayer.currentTime = playbackPosition.value;
            audioPlayer.play();
            isPaused.value = false;
        } else {
            playbackPosition.value = audioPlayer.currentTime;
            audioPlayer.pause();
            isPaused.value = true;
        }
    } else {
        audioPlayer.src = recording.value.url;
        audioPlayer.play();
        isPlaying.value = true;
        isPaused.value = false;
        playbackPosition.value = 0;
    }
};

// start recording function
const startRecording = async () => {
    try {
        timer.value = 0;

        // reset recording if already recorded before
        if (recording.value) {
            URL.revokeObjectURL(recording.value.url);
            recording.value = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // check for supported audio formats
        const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];

        let selectedMimeType = '';
        for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                selectedMimeType = type;
                break;
            }
        }

        if (!selectedMimeType) {
            throw new Error('No supported audio format found');
        }

        const options = {
            audioBitsPerSecond: 128000,
            mimeType: selectedMimeType
        };

        mediaRecorder.value = new MediaRecorder(stream, options);
        audioChunks.value = [];

        mediaRecorder.value.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.value.push(event.data);
            }
        };

        mediaRecorder.value.onstop = () => {
            if (audioChunks.value.length === 0) {
                return;
            }

            const audioBlob = new Blob(audioChunks.value, { type: selectedMimeType });
            const audioUrl = URL.createObjectURL(audioBlob);

            recording.value = {
                url: audioUrl,
                duration: timer.value,
                mimeType: selectedMimeType // store the selected MIME type
            };
        };

        mediaRecorder.value.start(1000);
        timerInterval = setInterval(() => {
            timer.value++;
        }, 1000);
    } catch (error) {
        console.error('Error when starting the recording:', error);
    }
};

const checkBrowserSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recordings');
        return false;
    }

    if (typeof MediaRecorder === 'undefined') {
        alert('Your browser does not support MediaRecorder');
        return false;
    }

    return true;
};

// start and stop recording
const toggleRecording = async () => {
    if (!checkBrowserSupport()) return;

    isRecording.value = !isRecording.value;
    if (isRecording.value) {
        await startRecording();
    } else {
        stopRecording();
    }
};

// stop recording function
const stopRecording = () => {
    if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
        mediaRecorder.value.stop();
        mediaRecorder.value.stream.getTracks().forEach((track) => track.stop());
        clearInterval(timerInterval);
    }
};

const email = ref('');
const isLoading = ref(false);

// email validation
const isValidEmail = computed(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.value);
});

// function to transform the recording
const transformRecording = async () => {
    if (!isValidEmail.value || !recording.value) return;

    try {
        isLoading.value = true;

        const response = await fetch(recording.value.url);
        const audioBlob = await response.blob();

        const formData = new FormData();
        const fileName = `recording${recording.value.mimeType.replace('audio/', '.')}`;
        formData.append('audio', audioBlob, fileName);
        formData.append('email', email.value);

        const result = await fetch('http://localhost:3000/transform', {
            method: 'POST',
            body: formData
        });

        if (!result.ok) throw new Error('Error sending audio');

        // Process the returned audio with the correct MIME type
        const transformedBlob = await result.blob();
        const transformedUrl = URL.createObjectURL(new Blob([transformedBlob], { type: recording.value.mimeType }));

        // Save transformed audio with MIME type
        transformedRecording.value = {
            url: transformedUrl,
            duration: recording.value.duration,
            mimeType: recording.value.mimeType
        };
    } catch (error) {
        console.error('Error transforming audio:', error);
    } finally {
        isLoading.value = false;
    }
};

onUnmounted(() => {
    clearInterval(timerInterval);
    if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
        stopRecording();
    }
    if (recording.value) {
        URL.revokeObjectURL(recording.value.url);
    }
    audioPlayer.removeEventListener('ended', () => {});
    if (transformedRecording.value) {
        URL.revokeObjectURL(transformedRecording.value.url);
    }
    transformedAudioPlayer.removeEventListener('ended', () => {});
});

// refs for transformed audio
const transformedRecording = ref(null);
const transformedAudioPlayer = new Audio();
const isTransformedPlaying = ref(false);
const isTransformedPaused = ref(false);
const transformedPlaybackPosition = ref(0);

// toggle function to play and pause transformed recording
const toggleTransformedPlayback = () => {
    if (isTransformedPlaying.value) {
        if (transformedAudioPlayer.paused) {
            transformedAudioPlayer.currentTime = transformedPlaybackPosition.value;
            transformedAudioPlayer.play();
            isTransformedPaused.value = false;
        } else {
            transformedPlaybackPosition.value = transformedAudioPlayer.currentTime;
            transformedAudioPlayer.pause();
            isTransformedPaused.value = true;
        }
    } else {
        transformedAudioPlayer.src = transformedRecording.value.url;
        transformedAudioPlayer.play();
        isTransformedPlaying.value = true;
        isTransformedPaused.value = false;
        transformedPlaybackPosition.value = 0;
    }
};

// add event listener to audio players if recording was listened to the end that it starts from the beginning
onMounted(() => {
    audioPlayer.addEventListener('ended', () => {
        isPlaying.value = false;
        isPaused.value = false;
        playbackPosition.value = 0;
    });

    transformedAudioPlayer.addEventListener('ended', () => {
        isTransformedPlaying.value = false;
        isTransformedPaused.value = false;
        transformedPlaybackPosition.value = 0;
    });
});
</script>
