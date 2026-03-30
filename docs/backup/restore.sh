#!/bin/bash
# KAIROX バックアップリストアスクリプト
# 使い方: bash docs/restore.sh docs/backup_kairox_20260325.zip

set -e

BACKUP="${1:-docs/backup_kairox_20260328.zip}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/$BACKUP" ] && [ ! -f "$BACKUP" ]; then
  echo "Error: バックアップファイルが見つかりません: $BACKUP"
  exit 1
fi

# 絶対パスに変換
[[ "$BACKUP" != /* ]] && BACKUP="$ROOT/$BACKUP"

echo "=== KAIROX リストア開始 ==="
echo "対象: $BACKUP"
echo "展開先: $ROOT"
echo ""
read -p "本当にリストアしますか？現在のファイルが上書きされます。(y/N): " confirm
[[ "$confirm" != "y" && "$confirm" != "Y" ]] && echo "キャンセルしました" && exit 0

echo ""
echo "[1/4] バックアップを展開中..."
cd "$ROOT"
unzip -o "$BACKUP" -d "$ROOT" > /dev/null
echo "  完了"

echo "[2/4] フロントエンド依存関係を確認中..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "  node_modules が存在しません。npm install を実行します..."
  npm install
else
  echo "  node_modules 存在済み — スキップ"
fi

echo "[3/4] バックエンド依存関係を確認中..."
cd "$ROOT/backend"
if [ -f "requirements.txt" ]; then
  echo "  pip install -r requirements.txt を実行します..."
  pip install -r requirements.txt -q
fi

echo "[4/4] リストア完了"
echo ""
echo "=== 次のステップ ==="
echo "フロントエンドデプロイ: cd frontend && vercel deploy --prod"
echo "バックエンドデプロイ:   cd backend && railway up --service Kairox"
echo ""
echo "ローカル起動:"
echo "  フロント: cd frontend && npm run dev"
echo "  バック:   cd backend && uvicorn app.main:app --reload"
