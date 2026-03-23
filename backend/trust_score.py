"""
KAIROX — Trust Score Engine

スコア算出式:
  score = (avg_rating/5 * 40) + (on_time_rate * 30) + (completion_score * 20) + (id_verified * 10)

ランク:
  New     : 登録直後（completed < 20）
  Trusted : avg_rating >= 4.0 かつ completed >= 20
  Elite   : avg_rating >= 4.5 かつ completed >= 100
"""

from dataclasses import dataclass
from typing import Literal

Rank = Literal["new", "trusted", "elite"]


@dataclass
class TrustScore:
    score: float          # 0〜100
    rank: Rank
    avg_rating: float     # 1.0〜5.0
    on_time_rate: float   # 0.0〜1.0
    completed_jobs: int
    id_verified: bool
    breakdown: dict       # 内訳（デバッグ・表示用）


def _completion_score(completed: int) -> float:
    """完了件数を0〜1のスコアに変換（100件で上限）"""
    return min(completed / 100.0, 1.0)


def calculate(
    avg_rating: float,
    completed_jobs: int,
    on_time_jobs: int,
    id_verified: bool,
) -> TrustScore:
    """
    信頼スコアと自動ランクを計算して返す。

    Args:
        avg_rating:    旅行者レビューの平均評価（1.0〜5.0）
        completed_jobs: 完了件数
        on_time_jobs:  時間通り完了した件数
        id_verified:   身分証確認済みか
    """
    on_time_rate = (on_time_jobs / completed_jobs) if completed_jobs > 0 else 0.0

    rating_component     = (avg_rating / 5.0) * 40.0
    on_time_component    = on_time_rate * 30.0
    completion_component = _completion_score(completed_jobs) * 20.0
    id_component         = 10.0 if id_verified else 0.0

    score = rating_component + on_time_component + completion_component + id_component

    # ランク判定
    if avg_rating >= 4.5 and completed_jobs >= 100:
        rank: Rank = "elite"
    elif avg_rating >= 4.0 and completed_jobs >= 20:
        rank = "trusted"
    else:
        rank = "new"

    return TrustScore(
        score=round(score, 1),
        rank=rank,
        avg_rating=round(avg_rating, 2),
        on_time_rate=round(on_time_rate, 3),
        completed_jobs=completed_jobs,
        id_verified=id_verified,
        breakdown={
            "rating":     round(rating_component, 1),
            "on_time":    round(on_time_component, 1),
            "completion": round(completion_component, 1),
            "id":         id_component,
        },
    )


def recalculate_from_reviews(
    reviews: list[dict],
    completed_jobs: int,
    on_time_jobs: int,
    id_verified: bool,
) -> TrustScore:
    """
    レビューリスト（[{"rating": 5}, ...]）から平均評価を算出してスコアを計算する。
    レビューがゼロの場合は avg_rating=0.0 として扱う。
    """
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    else:
        avg_rating = 0.0

    return calculate(
        avg_rating=avg_rating,
        completed_jobs=completed_jobs,
        on_time_jobs=on_time_jobs,
        id_verified=id_verified,
    )
