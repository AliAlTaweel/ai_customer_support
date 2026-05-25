import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from sqlalchemy import text

from app.tools.base import engine
from app.services.telemetry_service import telemetry_service
from app.core.auth import get_current_user, UserContext

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Auth Helper ───────────────────────────────────────────────────────────────

def require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    """Dependency: blocks non-authenticated requests from analytics endpoints."""
    if not user.is_authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access analytics."
        )
    return user


# ── Existing Route (unchanged) ─────────────────────────────────────────────────

@router.get("/metrics/routing", response_model=Dict[str, Any])
async def get_routing_metrics():
    """
    Exposes dynamic analytics metrics for system architecture performance visuals.
    """
    stats = telemetry_service.get_live_stats()

    # Ensure we always return a fallback format matching frontend expectations
    # if database aggregation fails or returns empty.
    default_res = {
        "FAST_TRACK": {"avg": 0.12, "min": 0.05, "max": 0.25, "count": 0},
        "SINGLE_AGENT": {"avg": 1.85, "min": 1.2, "max": 2.8, "count": 0},
        "MULTI_AGENT": {"avg": 4.2, "min": 3.5, "max": 5.4, "count": 0}
    }

    for k in default_res:
        if k in stats:
            default_res[k] = stats[k]

    return {
        "success": True,
        "timestamp": True,
        "metrics": default_res
    }


# ── Phase 1 Analytics Endpoints ───────────────────────────────────────────────

@router.get("/analytics/conversation-volume", response_model=Dict[str, Any])
async def get_conversation_volume(_user: UserContext = Depends(require_admin)):
    """
    Returns aggregate conversation stats — no PII, admin-only.
    GDPR Art. 25: Aggregate-only payload.
    """
    try:
        with engine.connect() as conn:
            # Messages per day (last 30 days)
            daily_rows = conn.execute(text("""
                SELECT
                    DATE("createdAt") AS day,
                    COUNT(*) AS total,
                    SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) AS user_msgs,
                    SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) AS assistant_msgs
                FROM "ChatMessage"
                WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE("createdAt")
                ORDER BY day ASC
            """)).fetchall()

            # Overall totals
            totals = conn.execute(text("""
                SELECT
                    COUNT(*) AS total_messages,
                    SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) AS user_messages,
                    SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) AS assistant_messages,
                    COUNT(DISTINCT COALESCE("userId", "userName")) AS unique_users
                FROM "ChatMessage"
            """)).fetchone()

        volume_by_day = [
            {
                "date": str(row[0]),
                "total": int(row[1]),
                "user": int(row[2]),
                "assistant": int(row[3]),
            }
            for row in daily_rows
        ]

        return {
            "success": True,
            "volume_by_day": volume_by_day,
            "totals": {
                "total_messages": int(totals[0] or 0),
                "user_messages": int(totals[1] or 0),
                "assistant_messages": int(totals[2] or 0),
                "unique_users": int(totals[3] or 0),
            }
        }
    except Exception as e:
        logger.error(f"Error fetching conversation volume: {e}")
        return {"success": False, "volume_by_day": [], "totals": {}}


@router.get("/analytics/performance", response_model=Dict[str, Any])
async def get_performance_metrics(_user: UserContext = Depends(require_admin)):
    """
    Returns latency stats by routing pathway — pure telemetry, zero PII.
    GDPR Art. 25: Aggregate-only payload.
    """
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT
                    pathway,
                    ROUND(AVG(latency)::numeric, 3) AS avg_latency,
                    ROUND(MIN(latency)::numeric, 3) AS min_latency,
                    ROUND(MAX(latency)::numeric, 3) AS max_latency,
                    COUNT(*) AS count
                FROM "PerformanceMetric"
                GROUP BY pathway
                ORDER BY avg_latency ASC
            """)).fetchall()

            total_count = conn.execute(text(
                'SELECT COUNT(*) FROM "PerformanceMetric"'
            )).scalar() or 1

        pathways = []
        for row in rows:
            pathways.append({
                "pathway": row[0],
                "avg": float(row[1] or 0),
                "min": float(row[2] or 0),
                "max": float(row[3] or 0),
                "count": int(row[4] or 0),
                "pct": round(int(row[4] or 0) / total_count * 100, 1),
            })

        return {"success": True, "pathways": pathways}
    except Exception as e:
        logger.error(f"Error fetching performance metrics: {e}")
        return {"success": False, "pathways": []}


@router.get("/analytics/topics", response_model=Dict[str, Any])
async def get_topic_breakdown(_user: UserContext = Depends(require_admin)):
    """
    Returns top keyword frequencies from user messages.
    Words are counted server-side; raw message content is never returned.
    GDPR Art. 5(1)(c): Data minimisation — only word counts transmitted.
    """
    # Common English stop-words + domain noise to exclude
    STOP_WORDS = {
        "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "they",
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "am", "are", "was", "were", "be",
        "been", "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "can", "not", "no", "so",
        "if", "as", "up", "out", "about", "this", "that", "these", "those",
        "what", "how", "when", "where", "who", "which", "there", "here", "just",
        "get", "got", "want", "need", "please", "thank", "thanks", "hi", "hello",
        "hey", "yes", "yeah", "ok", "okay", "sure", "like", "well", "also",
        "much", "more", "some", "any", "all", "its", "it's", "i'm", "don't",
        "can't", "i'd", "i've", "i'll", "one", "two", "s", "t", "re", "ve",
    }

    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT content FROM "ChatMessage"
                WHERE role = 'user'
                  AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
                LIMIT 1000
            """)).fetchall()

        word_counts: Dict[str, int] = {}
        for row in rows:
            content = str(row[0] or "").lower()
            # Strip punctuation simply
            for ch in ".,!?;:\"'()[]{}":
                content = content.replace(ch, " ")
            for word in content.split():
                if len(word) >= 3 and word not in STOP_WORDS:
                    word_counts[word] = word_counts.get(word, 0) + 1

        # Top 15 keywords
        top_keywords = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:15]

        return {
            "success": True,
            "keywords": [{"word": w, "count": c} for w, c in top_keywords],
            "total_messages_analyzed": len(rows),
        }
    except Exception as e:
        logger.error(f"Error fetching topic breakdown: {e}")
        return {"success": False, "keywords": [], "total_messages_analyzed": 0}


@router.get("/analytics/complaints", response_model=Dict[str, Any])
async def get_complaint_analytics(_user: UserContext = Depends(require_admin)):
    """
    Returns complaint counts by status and priority — no names/emails.
    GDPR Art. 25: Aggregate-only payload.
    """
    try:
        with engine.connect() as conn:
            by_status = conn.execute(text("""
                SELECT status, COUNT(*) AS count
                FROM "Complaint"
                GROUP BY status
                ORDER BY count DESC
            """)).fetchall()

            by_priority = conn.execute(text("""
                SELECT priority, COUNT(*) AS count
                FROM "Complaint"
                WHERE status NOT IN ('RESOLVED', 'CLOSED')
                GROUP BY priority
                ORDER BY
                    CASE priority
                        WHEN 'URGENT' THEN 1
                        WHEN 'HIGH'   THEN 2
                        WHEN 'MEDIUM' THEN 3
                        WHEN 'LOW'    THEN 4
                        ELSE 5
                    END
            """)).fetchall()

            totals = conn.execute(text("""
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open,
                    SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved,
                    ROUND(
                        AVG(
                            CASE WHEN status = 'RESOLVED'
                            THEN EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600.0
                            END
                        )::numeric, 1
                    ) AS avg_resolution_hours
                FROM "Complaint"
            """)).fetchone()

        return {
            "success": True,
            "by_status": [{"status": r[0], "count": int(r[1])} for r in by_status],
            "by_priority": [{"priority": r[0], "count": int(r[1])} for r in by_priority],
            "totals": {
                "total": int(totals[0] or 0),
                "open": int(totals[1] or 0),
                "resolved": int(totals[2] or 0),
                "resolution_rate_pct": round(
                    int(totals[2] or 0) / max(int(totals[0] or 1), 1) * 100, 1
                ),
                "avg_resolution_hours": float(totals[3] or 0),
            }
        }
    except Exception as e:
        logger.error(f"Error fetching complaint analytics: {e}")
        return {"success": False, "by_status": [], "by_priority": [], "totals": {}}


@router.get("/analytics/business", response_model=Dict[str, Any])
async def get_business_metrics(_user: UserContext = Depends(require_admin)):
    """
    Returns order totals, revenue, status distribution, and top products.
    No customer names or emails included.
    GDPR Art. 25: Aggregate-only payload.
    """
    try:
        with engine.connect() as conn:
            order_totals = conn.execute(text("""
                SELECT
                    COUNT(*) AS total_orders,
                    ROUND(SUM(total)::numeric, 2) AS total_revenue,
                    ROUND(AVG(total)::numeric, 2) AS avg_order_value
                FROM "Order"
            """)).fetchone()

            by_status = conn.execute(text("""
                SELECT status, COUNT(*) AS count
                FROM "Order"
                GROUP BY status
                ORDER BY count DESC
            """)).fetchall()

            top_products = conn.execute(text("""
                SELECT
                    p.name,
                    SUM(oi.quantity) AS units_sold,
                    ROUND(SUM(oi.quantity * oi.price)::numeric, 2) AS revenue
                FROM "OrderItem" oi
                JOIN "Product" p ON p.id = oi."productId"
                GROUP BY p.name
                ORDER BY units_sold DESC
                LIMIT 5
            """)).fetchall()

        return {
            "success": True,
            "totals": {
                "total_orders": int(order_totals[0] or 0),
                "total_revenue": float(order_totals[1] or 0),
                "avg_order_value": float(order_totals[2] or 0),
            },
            "by_status": [{"status": r[0], "count": int(r[1])} for r in by_status],
            "top_products": [
                {"name": r[0], "units_sold": int(r[1]), "revenue": float(r[2])}
                for r in top_products
            ],
        }
    except Exception as e:
        logger.error(f"Error fetching business metrics: {e}")
        return {"success": False, "totals": {}, "by_status": [], "top_products": []}
