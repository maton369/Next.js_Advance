import { prisma } from "@/lib/prisma";

/**
 * Route Handler: GET /api/categories
 *
 * - App Router の API ルート（Route Handler）として動作する GET ハンドラ。
 * - 想定パスは `app/api/categories/route.ts` のような配置。
 *
 * 目的：
 * - Category テーブルからカテゴリ一覧を取得し、各カテゴリに紐づく写真枚数（totalPhotoCount）も併せて返す。
 *
 * アルゴリズム的な見方（DB問い合わせ→整形→JSON返却）：
 * 1. Prisma を使って Category レコードを全件取得する
 * 2. 同時に各カテゴリに紐づく photos の件数を集計する（_count）
 * 3. DBから返ってきた形（_count を含む）を API レスポンス用に整形する
 * 4. JSON としてクライアントへ返す
 */
export async function GET() {
    // ★: Category テーブルのレコードを全て取得する

    /**
     * categories の取得（Prisma: findMany）
     *
     * - `prisma.category.findMany(...)` は Category モデルのレコードを複数取得するクエリ。
     * - 引数に `include` を指定することで、関連情報を同時に取得できる。
     *
     * include: { _count: { select: { photos: true } } } の意味：
     * - Prisma の `_count` は、関連（Relation）の “件数” を返すための仕組み。
     * - `select: { photos: true }` とすることで
     *   「このカテゴリに紐づく photos の数」を `_count.photos` として取得できる。
     *
     * なぜ件数を取るのか（設計意図）：
     * - フロント側で「カテゴリ名 + 写真枚数」を表示したい場合、
     *   全写真を取得して数えるより、DBに集計させた方が効率的である。
     *
     * アルゴリズム的には：
     * - “カテゴリ一覧” と “カテゴリごとの写真件数” を一度の問い合わせで得て、
     *   フロントに必要な情報（集計済み）を渡す、という集約（aggregation）になっている。
     */
    const categories = await prisma.category.findMany({
        include: { _count: { select: { photos: true } } },
    });

    /**
     * ログ出力（サーバ側）
     *
     * - API が呼ばれた時刻を ISO 形式でログに残している。
     * - 開発中のトレースや、アクセス頻度の把握に便利。
     *
     * 注意：
     * - 本番ではログ量や個人情報の混入に配慮し、ログレベル管理や集約基盤を使うのが一般的。
     */
    console.log(`GET: /api/categories ${new Date().toISOString()}`);

    /**
     * レスポンス整形（API用の形に変換）
     *
     * Prisma の返り値の categories は、
     * - Category の各フィールド（id, name, label, ...）
     * - 追加で include した `_count`（例：{ photos: 12 }）
     * を含む形になる。
     *
     * しかし API の利用者（フロント）からすると、
     * - `_count` のような Prisma 固有の構造は隠して
     * - `totalPhotoCount` のようなドメイン的に分かりやすい名前で返したい
     * という要求が出やすい。
     *
     * categories.map(({ _count, ...category }) => ({ ...category, totalPhotoCount: _count.photos }))
     * の意味：
     * 1. 分割代入で `_count` を取り出し、残りを category にまとめる
     * 2. category（元のカテゴリ情報）を展開しつつ、
     * 3. `totalPhotoCount` フィールドを新規に追加して返す
     *
     * アルゴリズム的には「内部表現（Prisma結果）→外部表現（APIレスポンス）」への射影（projection）。
     */
    return Response.json({
        categories: categories.map(({ _count, ...category }) => ({
            ...category,
            totalPhotoCount: _count.photos,
        })),
    });

    /**
     * Response.json(...) について
     *
     * - Route Handler では `Response`（Web標準）を返す。
     * - `Response.json` は JSON 返却用のヘルパーで、Content-Type 等を適切に設定してくれる。
     *
     * 返す JSON の形：
     * {
     *   "categories": [
     *     { ...categoryFields, "totalPhotoCount": 12 },
     *     ...
     *   ]
     * }
     */
}