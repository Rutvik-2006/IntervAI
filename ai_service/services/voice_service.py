import math
import re
import os

class VoiceService:
    def analyze_audio_text(self, text: str, duration_seconds: float = 30.0):
        """
        Calculates speech & communication metrics 100% locally (0 External API Calls).
        """
        clean_text = text or ""
        words = re.findall(r'\b\w+\b', clean_text)
        word_count = len(words)
        
        dur_val = float(duration_seconds) if duration_seconds else 0.0
        if dur_val > 1.0:
            duration = dur_val
        else:
            duration = max(3.0, word_count / 2.3)

        minutes = duration / 60.0
        wpm = round(word_count / minutes, 1) if minutes > 0 else 0.0
        
        filler_dict = {
            "um": len(re.findall(r'\bum\b', clean_text, re.IGNORECASE)),
            "uh": len(re.findall(r'\buh\b', clean_text, re.IGNORECASE)),
            "like": len(re.findall(r'\blike\b', clean_text, re.IGNORECASE)),
            "you know": len(re.findall(r'\byou know\b', clean_text, re.IGNORECASE)),
            "basically": len(re.findall(r'\bbasically\b', clean_text, re.IGNORECASE)),
            "actually": len(re.findall(r'\bactually\b', clean_text, re.IGNORECASE))
        }
        
        filler_count = sum(filler_dict.values())
        detected_fillers = [{"word": word, "count": count} for word, count in filler_dict.items() if count > 0]
        
        sentences = [s for s in re.split(r'[.?!,;]', clean_text) if s.strip()]
        total_pauses = max(0, len(sentences) - 1 + int(filler_count * 0.5))
        avg_pause_duration = round(max(0.5, (duration - (word_count / 2.5)) / max(total_pauses, 1)), 1)
        
        wpm_penalty = max(0.0, abs(wpm - 135) * 0.4)
        filler_penalty = filler_count * 4
        fluency_score = max(30, min(100, int(100 - wpm_penalty - filler_penalty)))
        
        clarity_score = max(40, min(100, int(82 + min(15, word_count * 0.15) - (filler_count * 2.5))))
        communication_score = round((fluency_score + clarity_score) / 2.0, 1)
        
        print(f"⚡ [Local Python Voice Service] Speech Analyzed (100% Offline Local) | WPM: {wpm} | Fillers: {filler_count} | Score: {communication_score}/100")

        return {
            "transcription": clean_text,
            "wpm": wpm,
            "word_count": word_count,
            "filler_count": filler_count,
            "detected_filler_words": detected_fillers,
            "pause_analysis": {
                "total_pauses": total_pauses,
                "average_pause_duration_sec": avg_pause_duration
            },
            "fluency_score": fluency_score,
            "clarity_score": clarity_score,
            "communication_score": communication_score,
            "source": "offline_local_python_voice_engine"
        }

    def transcribe_audio_file(self, file_bytes: bytes, filename: str = "audio.webm"):
        """
        100% Offline Local Whisper Speech-to-Text Transcription (Zero External APIs)
        """
        try:
            import whisper
            print("⚡ [Local Python Voice Service] Transcribing audio with local Whisper model...")
            model = whisper.load_model("tiny")
            temp_path = f"temp_{filename}"
            with open(temp_path, "wb") as f:
                f.write(file_bytes)
            result = model.transcribe(temp_path)
            if os.path.exists(temp_path):
                os.remove(temp_path)
            transcription = result.get("text", "").strip()
            print(f"⚡ [Local Python Voice Service] Offline STT Result: '{transcription}'")
            return {"transcription": transcription, "engine": "offline_local_whisper"}
        except Exception as e:
            print(f"⚡ [Local Python Voice Service] Local audio received. Using local browser speech transcript.")
            return {"transcription": "", "engine": "local_browser_speech"}

voice_service = VoiceService()
