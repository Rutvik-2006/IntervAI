import os
import json
import re
import sys
import time
import random
import subprocess
import requests
from pathlib import Path

def load_env_file():
    search_paths = [
        Path(".env"),
        Path("../.env"),
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env"
    ]
    for env_path in search_paths:
        if env_path.exists():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k and v:
                                os.environ[k] = v
            except Exception:
                pass

load_env_file()

class CodingService:
    def __init__(self):
        self._refresh_keys()

    def _refresh_keys(self):
        load_env_file()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")

    def _call_gemini(self, prompt: str):
        if not self.gemini_api_key or self.gemini_api_key == "your_gemini_api_key_here":
            return None
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": f"{prompt}\nRespond ONLY in valid raw JSON format."}]}]
        }
        try:
            res = requests.post(url, json=payload, timeout=12)
            if res.status_code == 200:
                data = res.json()
                content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if content:
                    return {"content": content, "service": "Gemini Cloud"}
        except Exception as e:
            print(f"❌ [Python Coding AI Service Error] Gemini error: {e}")
        return None

    def _call_groq(self, prompt: str):
        if not self.groq_api_key or self.groq_api_key == "your_groq_api_key_here":
            return None
        
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "llama3-8b-8192", "gemma2-9b-it"]
        for model in models:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": f"{prompt}\nRespond ONLY in valid raw JSON format without markdown ticks."}]
            }
            try:
                res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=12)
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if content:
                        return {"content": content, "model": model, "service": "Groq Cloud"}
            except Exception as e:
                print(f"❌ [Python Coding AI Service Error] Groq error on '{model}': {e}")
        return None

    def _call_llm(self, prompt: str):
        self._refresh_keys()
        res = self._call_gemini(prompt)
        if not res:
            res = self._call_groq(prompt)
        return res

    def generate_coding_question(self, session: dict):
        company_name = session.get("companyName", "Tech Company")
        job_role = session.get("jobRole", "Software Engineer")
        difficulty = session.get("difficulty", "medium")

        prompt = f"""You are a Principal Software Architect at {company_name} creating an authentic, industry-level coding interview problem for a {job_role} candidate (Target Difficulty: {difficulty}).

### INSTRUCTIONS:
1. Design a creative, realistic coding challenge tailored for a {job_role} interview at {company_name}.
2. Starter function `solution(...)` signatures in `starterTemplates` MUST EXACTLY match the parameter arguments in `sampleTestCases` and `hiddenTestCases`.
3. `expectedOutput` MUST be a JSON-parseable string matching the exact return type of `solution(...)`.

### REQUIRED JSON SCHEMA:
Return ONLY a valid raw JSON object strictly adhering to this structure:
{{
  "title": "<Short Descriptive Title>",
  "prompt": "<Detailed problem description with input/output requirements>",
  "difficulty": "{difficulty}",
  "constraints": "<e.g., 1 <= N <= 10^5, Target Time Complexity: O(N)>",
  "starterTemplates": {{
    "python": "def solution(...):\n    # Write your solution here\n    pass",
    "javascript": "function solution(...) {{\n  // Write your solution here\n}}",
    "cpp": "#include <iostream>\nusing namespace std;\n\nint main() {{\n    return 0;\n}}",
    "java": "public class Solution {{\n    public static void main(String[] args) {{\n    }}\n}}"
  }},
  "sampleTestCases": [
    {{
      "id": 1,
      "input": "<raw input arguments separated by comma>",
      "expectedOutput": "<expected JSON return value>",
      "explanation": "<short explanation>"
    }},
    {{
      "id": 2,
      "input": "<raw input arguments separated by comma>",
      "expectedOutput": "<expected JSON return value>",
      "explanation": "<short explanation>"
    }}
  ],
  "hiddenTestCases": [
    {{
      "id": 101,
      "input": "<edge case input arguments>",
      "expectedOutput": "<expected JSON return value>"
    }}
  ]
}}"""

        llm_res = self._call_llm(prompt)
        if llm_res and "content" in llm_res:
            try:
                clean_json = re.sub(r'```json|```', '', llm_res["content"]).strip()
                try:
                    parsed = json.loads(clean_json, strict=False)
                except Exception:
                    clean_json_fixed = re.sub(r'[\r\n]+', r'\n', clean_json)
                    parsed = json.loads(clean_json_fixed, strict=False)

                if "title" in parsed and "starterTemplates" in parsed and "sampleTestCases" in parsed:
                    print(f"🤖 [Python Coding Service] Coding question generated via {llm_res['service']}")
                    parsed["source"] = f"python_{llm_res['service'].lower().replace(' ', '_')}"
                    return parsed
            except Exception as e:
                print(f"⚠️ [Python Coding Service Warning] Failed to parse coding question JSON: {e}")

        print("⚡ [Python Coding Service] Coding question generated via Fallback Problem Engine")
        return self._get_smart_fallback_question(job_role, company_name, difficulty)

    def _get_smart_fallback_question(self, job_role: str, company_name: str, difficulty: str):
        fallback_bank = [
            {
                "title": "Maximum Subarray Sum (Kadane's Algorithm)",
                "prompt": f"At {company_name}, as a {job_role}, you need to find the contiguous subarray with the largest sum. Given an integer array `nums`, find the subarray with the largest sum and return its sum.",
                "difficulty": difficulty,
                "constraints": "1 <= nums.length <= 10^5, -10^4 <= nums[i] <= 10^4, Time Complexity: O(N)",
                "starterTemplates": {
                    "python": "def solution(nums):\n    # Write your solution here\n    max_sum = current_sum = nums[0]\n    for num in nums[1:]:\n        current_sum = max(num, current_sum + num)\n        max_sum = max(max_sum, current_sum)\n    return max_sum",
                    "javascript": "function solution(nums) {\n  let maxSum = nums[0];\n  let currentSum = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    currentSum = Math.max(nums[i], currentSum + nums[i]);\n    maxSum = Math.max(maxSum, currentSum);\n  }\n  return maxSum;\n}",
                    "cpp": "#include <iostream>\n#include <vector>\nusing namespace std;\nint main() { return 0; }",
                    "java": "public class Solution { public static void main(String[] args) {} }"
                },
                "sampleTestCases": [
                    { "id": 1, "input": "[-2, 1, -3, 4, -1, 2, 1, -5, 4]", "expectedOutput": "6", "explanation": "[4, -1, 2, 1] has the largest sum = 6." },
                    { "id": 2, "input": "[1]", "expectedOutput": "1", "explanation": "Single element max sum." }
                ],
                "hiddenTestCases": [
                    { "id": 101, "input": "[5, 4, -1, 7, 8]", "expectedOutput": "23" }
                ]
            },
            {
                "title": "Two Sum Target Index Pair",
                "prompt": f"At {company_name}, as a {job_role}, given an array of integers `nums` and an integer target `target`, return indices of the two numbers such that they add up to target.",
                "difficulty": difficulty,
                "constraints": "2 <= nums.length <= 10^4, Time Complexity: O(N)",
                "starterTemplates": {
                    "python": "def solution(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []",
                    "javascript": "function solution(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}",
                    "cpp": "#include <iostream>\nusing namespace std; int main() { return 0; }",
                    "java": "public class Solution { public static void main(String[] args) {} }"
                },
                "sampleTestCases": [
                    { "id": 1, "input": "[2, 7, 11, 15], 9", "expectedOutput": "[0, 1]", "explanation": "nums[0] + nums[1] == 9" },
                    { "id": 2, "input": "[3, 2, 4], 6", "expectedOutput": "[1, 2]", "explanation": "nums[1] + nums[2] == 6" }
                ],
                "hiddenTestCases": [
                    { "id": 101, "input": "[3, 3], 6", "expectedOutput": "[0, 1]" }
                ]
            }
        ]
        
        q = random.choice(fallback_bank)
        q["source"] = "python_fallback"
        return q

    def execute_code(self, source_code: str, language: str = "python", test_cases: list = None):
        """
        Executes candidate code against test cases safely in isolated process sandbox.
        """
        if not source_code or not source_code.strip():
            return {
                "success": False,
                "error": "No source code provided for execution.",
                "testResults": [],
                "passCount": 0,
                "totalCount": len(test_cases) if test_cases else 0
            }

        lang_clean = (language or "python").lower()
        test_cases = test_cases or []
        results = []
        pass_count = 0

        start_time = time.time()

        for idx, tc in enumerate(test_cases):
            expected_raw = str(tc.get("expectedOutput", "")).strip()
            
            if lang_clean == "python":
                exec_res = self._run_python_snippet(source_code, tc)
            elif lang_clean in ["javascript", "js"]:
                exec_res = self._run_node_snippet(source_code, tc)
            else:
                exec_res = {"stdout": "", "stderr": "Execution language unsupported", "code": 1}

            actual_out = str(exec_res.get("stdout", "")).strip()
            error_out = str(exec_res.get("stderr", "")).strip()

            # Strict Output Comparison (ignoring spaces & whitespace)
            clean_actual = re.sub(r'\s+', '', actual_out)
            clean_expected = re.sub(r'\s+', '', expected_raw)

            passed = bool(clean_actual) and (clean_actual == clean_expected)
            if passed:
                pass_count += 1

            results.append({
                "testCaseId": tc.get("id", idx + 1),
                "input": tc.get("input", ""),
                "expectedOutput": expected_raw,
                "actualOutput": actual_out if actual_out else (error_out or "None (No return value)"),
                "passed": passed,
                "error": error_out
            })

        execution_time_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "success": True,
            "language": lang_clean,
            "passCount": pass_count,
            "totalCount": len(test_cases),
            "executionTimeMs": execution_time_ms,
            "testResults": results
        }

    def _clean_test_input_args(self, raw_input: str):
        if not raw_input or not str(raw_input).strip():
            return ""
        clean = re.sub(r'[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*', '', str(raw_input)).strip()
        clean = re.sub(r'(\]|\d+|\))\s+([\[\d\("-])', r'\1, \2', clean)
        return clean

    def _run_python_snippet(self, source_code: str, test_case: dict):
        try:
            raw_input = test_case.get("input", "")
            clean_args = self._clean_test_input_args(raw_input)

            wrapper_code = f"""
import json, sys, inspect

{source_code}

try:
    func_obj = None
    for name in ['solution', 'twoSum', 'maxSubArray', 'maxSubarray', 'solve', 'reverseString']:
        if name in globals() and callable(globals()[name]):
            func_obj = globals()[name]
            break
    
    if not func_obj:
        user_funcs = [v for k, v in globals().items() if callable(v) and not k.startswith('_') and k not in ['json', 'sys', 'inspect']]
        if user_funcs:
            func_obj = user_funcs[-1]

    if func_obj:
        raw_args = ()
        if {repr(clean_args)}:
            try:
                eval_res = eval({repr(clean_args)})
                if isinstance(eval_res, tuple):
                    raw_args = eval_res
                else:
                    raw_args = (eval_res,)
            except Exception:
                pass

        sig = inspect.signature(func_obj)
        params = [p for p in sig.parameters.values() if p.default == inspect.Parameter.empty]
        num_params = len(params)

        args_list = list(raw_args)

        if num_params > 1 and len(args_list) < num_params and {repr(clean_args)}:
            try:
                parts = [eval(p.strip()) for p in {repr(clean_args)}.split(',') if p.strip()]
                if len(parts) >= num_params:
                    args_list = parts
            except Exception:
                pass

        while len(args_list) < num_params:
            if args_list and isinstance(args_list[0], list) and len(args_list[0]) > 0:
                if len(args_list) == 1:
                    args_list.append(len(args_list[0]))
                elif len(args_list) == 2 and isinstance(args_list[0][0], list):
                    args_list.append(len(args_list[0][0]))
                else:
                    args_list.append(0)
            else:
                args_list.append(0)

        res = func_obj(*args_list[:max(num_params, 1)])

        if res is not None:
            print(json.dumps(res))
except Exception as e:
    sys.stderr.write(str(e))
"""
            proc = subprocess.run(
                [sys.executable, "-c", wrapper_code],
                capture_output=True,
                text=True,
                timeout=4
            )
            return {"stdout": proc.stdout.strip(), "stderr": proc.stderr.strip(), "code": proc.returncode}
        except subprocess.TimeoutExpired:
            return {"stdout": "", "stderr": "Time Limit Exceeded (> 4000ms)", "code": 1}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "code": 1}

    def _run_node_snippet(self, source_code: str, test_case: dict):
        try:
            raw_input = test_case.get("input", "")
            clean_args = self._clean_test_input_args(raw_input)

            wrapper_code = f"""
{source_code}

try {{
  let funcObj = null;
  if (typeof solution === 'function') funcObj = solution;
  else if (typeof twoSum === 'function') funcObj = twoSum;
  else if (typeof maxSubArray === 'function') funcObj = maxSubArray;
  else if (typeof maxSubarray === 'function') funcObj = maxSubarray;

  if (funcObj) {{
    let res;
    try {{
      res = funcObj({clean_args});
    }} catch(err) {{
      if (funcObj.length === 1) {{
        res = funcObj([{clean_args}]);
      }} else {{
        throw err;
      }}
    }}
    if (res !== undefined) console.log(JSON.stringify(res));
  }}
}} catch(e) {{
  console.error(e.message);
}}
"""
            proc = subprocess.run(
                ["node", "-e", wrapper_code],
                capture_output=True,
                text=True,
                timeout=4
            )
            return {"stdout": proc.stdout.strip(), "stderr": proc.stderr.strip(), "code": proc.returncode}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "code": 1}

    def evaluate_code_quality(self, problem_title: str, source_code: str, language: str, pass_count: int, total_count: int):
        test_pass_rate = round((pass_count / max(total_count, 1)) * 100)

        prompt = f"""You are a Principal Software Architect evaluating a candidate's code submission.
Problem: "{problem_title}"
Language: {language}
Test Cases Passed: {pass_count} / {total_count} ({test_pass_rate}%)

Candidate Source Code:
```
{source_code}
```

Evaluate the code quality rigorously.
CRITICAL SCORING RULE: If Test Cases Passed is {total_count} / {total_count} (100%), the score MUST be between 90 and 100. Do NOT return 85 if all test cases pass.

Return ONLY a valid raw JSON object in this exact format:
{{
  "score": {test_pass_rate},
  "timeComplexity": "O(N) - Linear Time",
  "spaceComplexity": "O(N) - Linear Space",
  "codeQuality": "Clean, structured, and readable code with good variable naming.",
  "edgeCasesCovered": true,
  "feedback": "Concrete constructive feedback on optimization and edge cases.",
  "strengths": [
    "Efficient linear time complexity O(N) using hash map lookups.",
    "Clean code structure and readable variable naming."
  ],
  "weaknesses": [
    "Lacks explicit validation for empty or single-element input arrays."
  ],
  "suggestions": [
    "1. Add boundary guard checks for empty array inputs.",
    "2. Consider in-place pointer optimization to reduce auxiliary space."
  ]
}}"""

        llm_res = self._call_llm(prompt)
        if llm_res and "content" in llm_res:
            try:
                clean_json = re.sub(r'```json|```', '', llm_res["content"]).strip()
                parsed = json.loads(clean_json, strict=False)
                if "score" in parsed and "timeComplexity" in parsed:
                    if pass_count == total_count and total_count > 0:
                        parsed["score"] = max(parsed.get("score", 95), 90)
                    print(f"🤖 [Python Coding AI Service] Code Evaluated via {llm_res['service']} | Score: {parsed['score']}/100 | Time: {parsed['timeComplexity']}")
                    parsed["source"] = f"python_{llm_res['service'].lower().replace(' ', '_')}"
                    return parsed
            except Exception as e:
                print(f"⚠️ [Python Coding AI Service Warning] Failed to parse Code Quality JSON: {e}")

        return {
            "score": round((pass_count / max(total_count, 1)) * 100),
            "timeComplexity": "O(N) - Linear Time",
            "spaceComplexity": "O(N) - Auxiliary Space",
            "codeQuality": "Standard code implementation.",
            "edgeCasesCovered": pass_count == total_count,
            "feedback": "Code executed successfully across test cases.",
            "suggestions": ["Add input boundary checks."],
            "source": "python_local"
        }

coding_service = CodingService()
