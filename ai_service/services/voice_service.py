import math
import re

class VoiceService:
    def analyze_audio_text(self, text: str, duration_seconds: float = 30.0):
        """
        Calculates communication metrics from transcribed speech.
        """
        words = re.findall(r'\b\w+\b', text)
        word_count = len(words)
        
        minutes = max(duration_seconds / 60.0, 0.1)
        wpm = round(word_count / minutes, 1)
        
        filler_patterns = [r'\bum\b', r'\buh\b', r'\blike\b', r'\byou know\b', r'\bbasically\b', r'\bactually\b']
        filler_count = 0
        for pattern in filler_patterns:
            filler_count += len(re.findall(pattern, text, re.IGNORECASE))
            
        fluency_score = max(0, min(100, int(100 - (filler_count * 5) - max(0, abs(wpm - 130) * 0.5))))
        clarity_score = max(50, min(100, int(85 + (word_count * 0.2) - (filler_count * 3))))
        communication_score = round((fluency_score + clarity_score) / 2, 1)
        
        return {
            "transcription": text,
            "wpm": wpm,
            "word_count": word_count,
            "filler_count": filler_count,
            "fluency_score": fluency_score,
            "clarity_score": clarity_score,
            "communication_score": communication_score
        }

voice_service = VoiceService()
