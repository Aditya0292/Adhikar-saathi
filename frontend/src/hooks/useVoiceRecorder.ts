import { useState, useRef, useEffect } from 'react';

interface UseVoiceRecorderProps {
  onRecordingComplete: (blob: Blob, hasSpoken: boolean) => void;
}

export function useVoiceRecorder({ onRecordingComplete }: UseVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState<number>(0);
  const [silenceWarning, setSilenceWarning] = useState<string | null>(null);
  const [maxDurationReached, setMaxDurationReached] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    setSilenceWarning(null);
    setMaxDurationReached(false);
    setAmplitude(0);
    hasSpokenRef.current = false;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      // Setup Web Audio API Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Stop audio monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }

        const mimeType = (options as any).mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob, hasSpokenRef.current);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);

      // Start VAD Loop
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let lastSoundTime = Date.now();
      const startTime = Date.now();
      let threshold = 0.01; // Sensitive default
      let baselineChecked = false;
      const baselineSamples: number[] = [];

      const monitorAudio = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Compute average amplitude between 0 and 1
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalizedAmp = avg / 255;
        setAmplitude(normalizedAmp);

        const now = Date.now();
        const elapsed = now - startTime;

        // Calibrate baseline noise in the first 500ms
        if (elapsed < 500) {
          baselineSamples.push(normalizedAmp);
        } else if (!baselineChecked) {
          baselineChecked = true;
          const avgBaseline = baselineSamples.reduce((a, b) => a + b, 0) / (baselineSamples.length || 1);
          if (avgBaseline > 0.008) {
            threshold = 0.03; // Calibrate to higher threshold for noisy environment
            console.log("Noisy environment: threshold set to 0.03");
          }
        }

        if (normalizedAmp > threshold) {
          lastSoundTime = now;
          hasSpokenRef.current = true;
        }

        // 1. Silence warning: No sound in first 3s
        if (elapsed > 3000 && !hasSpokenRef.current) {
          setSilenceWarning("We can't hear you. Check your microphone.");
        }

        // 2. Silence auto-stop: 1.5s of silence, ONLY after they started speaking
        if (hasSpokenRef.current && (now - lastSoundTime > 1500)) {
          console.log("Auto-stopping due to 1.5s of silence after speech");
          stopRecording();
          return;
        }

        // 3. Absolute silence timeout: if no speech in first 8s, stop
        if (!hasSpokenRef.current && elapsed > 8000) {
          console.log("Auto-stopping due to no speech detected in first 8s");
          stopRecording();
          return;
        }

        // 4. Max duration check: 60s
        if (elapsed > 60000) {
          console.log("Max duration reached (60s)");
          setMaxDurationReached(true);
          stopRecording();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(monitorAudio);
      };

      animationFrameRef.current = requestAnimationFrame(monitorAudio);

    } catch (err: any) {
      console.error('Error starting voice recorder:', err);
      setError(err.message || 'Microphone access denied');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    amplitude,
    silenceWarning,
    maxDurationReached
  };
}
