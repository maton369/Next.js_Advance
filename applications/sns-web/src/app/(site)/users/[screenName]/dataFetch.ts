import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * getProfileFromScreenName（screenName から Profile + User を取得する関数）
 *
 * この実装の最大のポイントは `cache()` でラップしている点で、
 * “同じ引数で呼ばれた関数呼び出しの結果をメモ化する” ことで、
 * 同一リクエスト内（同一レンダリング内）における重複DBアクセスを抑える狙いがある。
 *
 * `cache`（React のメモ化関数）の概念：
 * - `cache(fn)` は “fn の呼び出し結果を引数に基づいてキャッシュする” ための仕組み。
 * - 同じ引数（ここでは screenName）で複数回呼ばれた場合、
 *   2回目以降は同じ Promise/結果を返すことで、I/O を再実行しない。
 *
 * アルゴリズム的な見方（メモ化付きキー解決）：
 * 1. 入力 screenName を受け取る
 * 2. キャッシュに (screenName → 結果) があればそれを返す（DBアクセスなし）
 * 3. 無ければ DB へ問い合わせて取得し、その結果をキャッシュに保存して返す
 *
 * これにより：
 * - 同じプロフィール情報を複数のコンポーネント/レイアウトが必要とする場合でも、
 *   DBクエリを1回に収束させやすい。
 */
export const getProfileFromScreenName = cache(async (screenName: string) => {
    /**
     * Profile の取得（DB I/O）
     *
     * prisma.profile.findUnique のポイント：
     * - where: { screenName } で screenName をキーに一意検索する。
     * - include: { user: true } で関連する User レコードも同時に取得する。
     *
     * なぜ findUnique なのか：
     * - schema で screenName に @unique が付いている前提なら、
     *   検索結果は 0 件か 1 件に確定するため findUnique が適切。
     *
     * include を使う理由（取得の閉包化 / N+1 回避）：
     * - Profile を取ってから User を別途取るとクエリが増えやすい。
     * - 1回の取得で必要情報（Profile + User）をまとめて返せる。
     *
     * 注意（where の書き方）：
     * - `where: { screenName: screenName }` は `where: { screenName }` と同義。
     * - ここは “明示したい” という意図がないなら短く書ける。
     */
    const profile = await prisma.profile.findUnique({
        where: { screenName: screenName },
        include: { user: true },
    });

    /**
     * 存在チェック（0件ケースの分岐）
     *
     * - findUnique は見つからないと null を返す。
     * - その場合 notFound() を呼び、Next.js の 404 フローへ切り替える。
     *
     * アルゴリズム的には：
     * - “入力キーが存在しない” を検出し、
     *   通常のレンダリングを中断して 404 を返す分岐点。
     *
     * 重要：
     * - `cache` を使っていても、notFound() が起きる入力は
     *   “404 になる結果” として同様に扱われる。
     * - つまり、同じ存在しない screenName が繰り返し参照される状況でも、
     *   無駄な DB アクセスを抑制できる可能性がある（実際のキャッシュスコープに依存）。
     */
    if (!profile) {
        notFound();
    }

    /**
     * Profile + User を返す
     *
     * - ここまで到達した時点で profile は必ず存在する。
     * - include しているので profile.user も参照できる。
     *
     * 呼び出し側はこの戻り値を使って：
     * - プロフィール画面（bio, screenName）
     * - ユーザー情報（name, email, image）
     * などをまとめて描画できる。
     */
    return profile;
});