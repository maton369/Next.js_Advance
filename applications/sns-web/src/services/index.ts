/**
 * host（API のホスト名/ベースURL）
 *
 * - `process.env.API_HOST` は環境変数から読み取る値で、
 *   API の接続先（origin）を外部から切り替えるために使う。
 *
 * 例（想定）：
 * - 開発: API_HOST="http://localhost:3000"（Next.js 自身の API を叩く）
 * - 開発: API_HOST="http://localhost:8080"（別プロセスのバックエンドを叩く）
 * - 本番: API_HOST="https://example.com"
 *
 * アルゴリズム的な意図：
 * - “接続先” をコードに直書きせず、実行環境に応じて差し替えられるようにする。
 *
 * 注意：
 * - 環境変数が未設定だと host は undefined になり得る。
 *   その場合 path() が "undefined/..." のようになって破綻するので、
 *   運用では必須チェック（起動時に throw）を入れることが多い。
 */
export const host = process.env.API_HOST;

/**
 * path（API の URL 組み立て関数）
 *
 * - `host` と `path` を連結して、API の完全な URL を作るためのユーティリティ。
 * - すべての API 呼び出しがこの関数を経由すれば、
 *   “URL 組み立てルール” を 1 箇所に閉じ込められる。
 *
 * 仕様：
 * - 引数 `path` が与えられれば `${host}${path}` を返す。
 * - 引数が未指定の場合でもテンプレート文字列により `${host}${undefined}` となり得るため、
 *   実運用では `path ?? ""` のようなガードを入れる設計もよくある。
 *
 * アルゴリズム的には：
 * - “部分情報（相対パス）” と “環境依存情報（host）” を合成して、
 *   “実際に叩く URL” を決定する処理。
 */
export const path = (path?: string) => `${host}${path}`;

/**
 * FetchError（HTTP エラーを表す独自例外）
 *
 * - fetch は「ネットワークエラー」では reject するが、
 *   404/500 のような HTTP エラーは Promise が resolve されてしまう（res.ok が false になるだけ）。
 *
 * そこで：
 * - HTTP エラーを “例外として扱えるように” するためのクラスを用意している。
 *
 * 目的：
 * - status（HTTP ステータスコード）をエラーオブジェクトに持たせ、
 *   呼び出し側で 404 と 500 を分岐できるようにする。
 *
 * アルゴリズム的な意図：
 * - “HTTP の失敗” を “例外（throw）” に変換し、
 *   成功/失敗を同じ制御構造（try/catch や Promise.catch）で扱えるようにする。
 */
export class FetchError extends Error {
    /**
     * status（HTTP ステータスコード）
     *
     * - 例：404, 401, 500 など
     * - これを持っていると “エラー種別の分岐” ができる。
     */
    status: number;

    /**
     * constructor
     *
     * - message: エラー文言（ここでは res.statusText を想定）
     * - status : HTTP ステータスコード
     */
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

/**
 * handleSucceed（fetch 成功時の共通処理）
 *
 * - fetch(...).then(handleSucceed) のように使い、
 *   Response を “データ” へ変換する関数。
 *
 * ここでの「成功」は “通信が成功して Response が得られた” という意味であり、
 * HTTP ステータスが 404/500 でも Response 自体は返る点が重要。
 *
 * アルゴリズム（Response → data or throw）：
 * 1. res.json() でレスポンスボディを JSON としてパースする
 * 2. res.ok を見て HTTP 成功（2xx）かどうか判定する
 * 3. 失敗（ok=false）なら FetchError を投げる
 * 4. 成功なら data を返す
 *
 * ポイント：
 * - “HTTP エラーを throw に変換” しているため、
 *   呼び出し側は catch で統一的に失敗を扱える。
 */
export const handleSucceed = async (res: Response) => {
    /**
     * data の取得
     *
     * - res.json() はボディを JSON として読む。
     * - ここで API の返却 JSON が壊れていると例外になる（その場合も catch に流れる）。
     *
     * 注意（順序について）：
     * - 現実には、エラー時（404/500）に JSON ではないボディが返ることもある。
     *   その場合 res.json() が先に失敗する可能性がある。
     * - 要件によっては、res.ok を先に判定してから body を読む設計もあり得る。
     */
    const data = await res.json();

    /**
     * HTTP ステータス判定
     *
     * - res.ok は 200〜299 の範囲なら true。
     * - false の場合は HTTP エラーとして扱う。
     */
    if (!res.ok) {
        /**
         * FetchError を投げる
         *
         * - message: res.statusText（例："Not Found" など）
         * - status : res.status（例：404）
         *
         * これにより “HTTP エラーも例外として扱える” ようになる。
         */
        throw new FetchError(res.statusText, res.status);
    }

    /**
     * 成功時：data を返す
     *
     * - 以後の then では “パース済みデータ” を受け取れる。
     */
    return data;
};

/**
 * handleFailed（失敗時の共通処理）
 *
 * - fetch(...).then(handleSucceed).catch(handleFailed) のように使い、
 *   ネットワークエラーや FetchError、JSON パース失敗などを一括で受け取る。
 *
 * アルゴリズム（err の正規化/ログ → 再スロー）：
 * 1. err が FetchError なら、HTTP エラーとして警告ログを出す
 * 2. その後 throw err で再スローし、呼び出し元へ失敗を伝播する
 *
 * なぜ再スローするのか：
 * - この関数がエラーを握りつぶすと、呼び出し側が失敗を検知できない。
 * - ここでは「ログはここでやるが、失敗としての扱いは上位に委ねる」設計になっている。
 */
export const handleFailed = async (err: unknown) => {
    /**
     * FetchError の場合のみログ
     *
     * - HTTP エラー（404/500など）は FetchError として throw されるため、
     *   ここで “API がエラーを返した” ことを分かりやすくログ出しできる。
     */
    if (err instanceof FetchError) {
        console.warn(err.message);
    }

    /**
     * エラーを再スロー
     *
     * - これにより Promise は reject のまま呼び出し側へ伝わる。
     * - 呼び出し側は try/catch や error.tsx 等で適切に扱える。
     */
    throw err;
};