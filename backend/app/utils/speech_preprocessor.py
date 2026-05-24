import re

# Basic number to words converter for English
ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
THOUSANDS = ["", "thousand", "million", "billion"]

def num_to_words_en(num: int) -> str:
    if num == 0:
        return "zero"
    
    def helper(n: int) -> str:
        if n < 10:
            return ONES[n]
        elif n < 20:
            return TEENS[n - 10]
        elif n < 100:
            return TENS[n // 10] + (" " + helper(n % 10) if n % 10 != 0 else "")
        elif n < 1000:
            return ONES[n // 100] + " hundred" + (" and " + helper(n % 100) if n % 100 != 0 else "")
        else:
            for i, unit in enumerate(THOUSANDS):
                if unit == "":
                    continue
                div = 1000 ** i
                if n < div * 1000:
                    return helper(n // div) + " " + unit + (" " + helper(n % div) if n % div != 0 else "")
            return str(n)
            
    return helper(num).strip()

def digit_to_word_en(char: str) -> str:
    digit_map = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
    }
    return digit_map.get(char, char)

def preprocess_for_speech(text: str, language: str) -> str:
    if not text:
        return ""
        
    lang_prefix = language.lower().split("-")[0]
    
    # 1. Strip all markdown
    # Remove bold, italics, headers, dashes/bullets
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"#{1,6}\s+", "", text)
    text = re.sub(r"^\s*-\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n\s*-\s+", " ", text)
    
    # Convert "1. First point" -> "First," and numeric lists to transitions
    text = re.sub(r"^\s*1\.\s+", "To start with, ", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*2\.\s+", "What's also important, ", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*3\.\s+", "And finally, ", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", ", ", text, flags=re.MULTILINE)
    
    # Remove general brackets containing URLs or citations
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text) # markdown links
    
    # 2. Expand legal abbreviations
    abbreviations = {
        r"\bIPC\b": "Indian Penal Code",
        r"\bCrPC\b": "Criminal Procedure Code",
        r"\bBNS\b": "Bharatiya Nyaya Sanhita",
        r"\bPWDVA\b": "Protection of Women from Domestic Violence Act",
        r"\bRTI\b": "Right to Information Act",
        r"\bSC\b": "Supreme Court",
        r"\bHC\b": "High Court",
        r"\bFIR\b": "First Information Report",
        r"\bPIL\b": "Public Interest Litigation",
    }
    for abbr, expanded in abbreviations.items():
        text = re.sub(abbr, expanded, text, flags=re.IGNORECASE)
        
    # 3. Number normalization
    # ₹2,000 / Rs. 2,000 -> two thousand rupees
    def replace_currency(match):
        val = match.group(1).replace(",", "")
        try:
            words = num_to_words_en(int(val))
            return f"{words} rupees"
        except ValueError:
            return match.group(0)
            
    text = re.sub(r"(?:₹|Rs\.?\s*)(\d+(?:,\d+)*)", replace_currency, text, flags=re.IGNORECASE)
    
    # Section 14(2) -> Section fourteen sub-section two
    def replace_section_sub(match):
        sec = match.group(1)
        sub = match.group(2)
        try:
            sec_word = num_to_words_en(int(sec))
            sub_word = num_to_words_en(int(sub))
            return f"Section {sec_word} sub-section {sub_word}"
        except ValueError:
            return match.group(0)
            
    text = re.sub(r"\bSection\s+(\d+)\((\d+)\)", replace_section_sub, text, flags=re.IGNORECASE)
    
    # Section numbers like "498A" -> "four nine eight A"
    def replace_sec_num(match):
        digits = match.group(1)
        letter = match.group(2)
        digit_words = " ".join(digit_to_word_en(d) for d in digits)
        if letter:
            return f"{digit_words} {letter}"
        return digit_words
        
    # Apply digit expansion for Section numbers
    text = re.sub(r"\b(?:Section|Sec\.?)\s+(\d+)([A-Z]?)\b", lambda m: f"Section {replace_sec_num(m)}", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(\d{3,4})([A-Z])\b", replace_sec_num, text)

    # Convert general numbers (e.g. 5 -> five)
    def replace_general_number(match):
        val = match.group(0)
        try:
            return num_to_words_en(int(val))
        except ValueError:
            return val
    text = re.sub(r"\b\d+\b", replace_general_number, text)
    
    # 4. Add SSML-style pauses (ElevenLabs punctuation pauses)
    # After full stops, make sure there is a clean pause space
    text = re.sub(r"\.\s*", ". ", text)
    
    # Wrap important terms in commas for slight pause breaks
    important_terms = [
        "Indian Penal Code", "Criminal Procedure Code", "Bharatiya Nyaya Sanhita",
        "Protection of Women from Domestic Violence Act", "Supreme Court", "High Court",
        "First Information Report"
    ]
    for term in important_terms:
        # Match case insensitively but preserve original casing
        text = re.sub(rf"\b({re.escape(term)})\b", r", \1, ", text, flags=re.IGNORECASE)
    
    # Clean up double commas or spaces around pauses
    text = re.sub(r"\s*,\s*,\s*", ", ", text)
    text = re.sub(r"\s+", " ", text).strip()
    
    # 5. Length check: Count words. If > 130 words:
    # Truncate at last complete sentence before word 120. Append query.
    words = text.split()
    if len(words) > 130:
        truncated_words = words[:120]
        truncated_text = " ".join(truncated_words)
        # Find last sentence end
        last_dot = truncated_text.rfind(".")
        last_q = truncated_text.rfind("?")
        split_idx = max(last_dot, last_q)
        if split_idx != -1:
            text = truncated_text[:split_idx + 1]
        else:
            text = truncated_text
            
        if lang_prefix == "hi":
            text += " क्या मैं आगे बताऊं?"
        else:
            text += " Shall I continue?"
            
    # 6. Language-specific cleanup for Hindi
    if lang_prefix == "hi":
        # Keep Devanagari characters, basic punctuation, and proper nouns (like NyayaSatya)
        # For simple cleanup, remove stray Roman letters/words unless they start with uppercase (proper nouns)
        # We can identify lowercase-only words and clean them.
        words_hi = text.split()
        cleaned_words = []
        for w in words_hi:
            # If word is English (has roman letters) and doesn't start with uppercase, skip it
            if re.match(r"^[a-z]+$", w):
                continue
            cleaned_words.append(w)
        text = " ".join(cleaned_words)
        
    return text
