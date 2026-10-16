"""Generate offline translation drafts with a local MLX model.

Usage: python SCRIPT CACHE MODEL_DIRECTORY [LIMIT]
No network, app dependencies or user data. Content is never marked human reviewed.
The cache is keyed by stable entry ID and guarded by exact source sentence text.
"""

import json, re, sys, time
from pathlib import Path
import mlx.core as mx
from mlx_lm import load
from mlx_lm.generate import batch_generate
from mlx_lm.sample_utils import make_sampler

cache, model_path = Path(sys.argv[1]), sys.argv[2]
rows = json.loads((cache / "prepared-rows.json").read_text())
output = cache / "qwen-example-translations.json"
translations = json.loads(output.read_text()) if output.exists() else {}
work = [
    (row, i, ex)
    for row in rows
    for i, ex in enumerate(row["examples"])
    if not (ex.get("en") and ex.get("ko"))
    and translations.get(row["id"] + ":" + str(i), {}).get("text") != ex["de"]
]
if len(sys.argv) > 3:
    work = work[: int(sys.argv[3])]
mx.set_cache_limit(32 * 1024 * 1024)
model, tokenizer = load(model_path)
print("model loaded", round(mx.get_active_memory() / 1024**3, 2), "GiB", flush=True)
system = "독일어 학습 예문을 정확한 영국 영어와 자연스러운 한국어로 번역하세요. 제시된 영어와 한국어 낱말 뜻을 참고하여 올바른 의미로 번역하세요. 시제, 수, 부정, 고유명사를 보존하세요. 해설 없이 en과 ko 키를 가진 JSON만 출력하세요. Translate faithfully; do not invent facts."
start = time.time()
failures = []
for offset in range(0, len(work), 8):
    batch = work[offset : offset + 8]
    prompts = []
    for row, i, example in batch:
        content = json.dumps(
            {
                "German": example["de"],
                "word": row["lemma"],
                "English_gloss": row["meaning_en"][0][:120],
                "Korean_gloss": row["meaning_ko"][0][:80],
                **({"English_translation": example["en"]} if example.get("en") else {}),
            },
            ensure_ascii=False,
        )
        prompts.append(
            tokenizer.apply_chat_template(
                [
                    {"role": "system", "content": system},
                    {"role": "user", "content": content},
                ],
                tokenize=True,
                add_generation_prompt=True,
            )
        )
    response = batch_generate(
        model,
        tokenizer,
        prompts,
        max_tokens=180,
        completion_batch_size=8,
        prefill_batch_size=2,
        sampler=make_sampler(temp=0),
        verbose=False,
    )
    for (row, i, example), raw in zip(batch, response.texts):
        try:
            result = json.loads(re.search(r"\{.*\}", raw, re.S).group())
            assert all(
                isinstance(result.get(lang), str) and result[lang].strip()
                for lang in ["en", "ko"]
            )
            assert re.search("[가-힣]", result["ko"]) and not re.search(
                "[가-힣]", result["en"]
            )
            translations[row["id"] + ":" + str(i)] = {
                "text": example["de"],
                "en": result["en"].strip(),
                "ko": result["ko"].strip(),
                "provenance": {
                    "kind": "local-model-draft",
                    "model": "Qwen/Qwen3-4B-Instruct-2507",
                    "conversion": "mlx-community/Qwen3-4B-Instruct-2507-4bit",
                    "revision": Path(model_path).name,
                    "modelLicense": "Apache-2.0",
                    "review": "native-speaker-review-pending",
                },
            }
        except Exception:
            failures.append({"id": row["id"], "text": example["de"], "output": raw})
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(translations, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(output)
    (cache / "qwen-translation-failures.json").write_text(
        json.dumps(failures, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        "translated",
        offset + len(batch),
        "/",
        len(work),
        "cached",
        len(translations),
        "failures",
        len(failures),
        "seconds",
        round(time.time() - start),
        "tokens/s",
        round(response.stats.generation_tps),
        flush=True,
    )
