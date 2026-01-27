"use client";

/**
 * LikeButton（いいねボタン：Client Component）
 *
 * - `"use client"` により、このコンポーネントはブラウザ上で動作する Client Component になる。
 * - onClick などのブラウザイベントを扱うには Client Component が必須。
 *
 * 役割：
 * - ユーザーがボタンを押したときに「いいね」を送信する（HTTP POST）。
 * - 画面表示（Server Component 側）とは別に、ユーザー操作の部分だけをクライアントで担当する。
 *
 * アルゴリズム的な見方（イベント → リクエスト）：
 * 1. ユーザーが「いいね」ボタンをクリックする
 * 2. onClick ハンドラが実行される
 * 3. `fetch` で Next.js の API Route に POST を投げる
 * 4. サーバ側が「いいね」処理（DB更新など）を行う（※ここではクライアント側からは見えない）
 * 5. 必要に応じて UI を更新する（※現状は未実装）
 */
export function LikeButton({ photoId }: { photoId: string }) {
  /**
   * props.photoId
   *
   * - どの写真に対する「いいね」なのかを識別するための ID。
   * - 親（写真詳細ページなど）から渡され、ボタンが押されたときのリクエスト先 URL を組み立てる材料になる。
   */
  return (
    <button
      onClick={() => {
        /**
         * fetch による POST リクエスト
         *
         * ★: 3000番ポートで動いている、自ホストサーバー（Next.js）へリクエスト
         *
         * - `/api/...` のような **先頭が / の相対パス** は、
         *   「今表示しているサイトと同じ origin（プロトコル+ホスト+ポート）」に対して送られる。
         *
         * 例：ブラウザで http://localhost:3000 を見ている場合
         * - fetch("/api/photos/123/like") は
         *   http://localhost:3000/api/photos/123/like
         *   に送られる。
         *
         * つまり、この fetch は
         * - 8080番ポートのバックエンドAPIではなく
         * - 3000番ポートの Next.js アプリ（自ホスト）に対して送る
         * という意図になる。
         *
         * method: "POST" の意味：
         * - 「いいね」= 状態変更（書き込み）なので、GET ではなく POST を使うのが自然。
         * - サーバ側ではこの POST を受けて、DB更新や外部API呼び出し等の副作用処理を行う。
         *
         * アルゴリズム的には：
         * - 入力：photoId
         * - 変換：`/api/photos/${photoId}/like` というエンドポイントに埋め込む
         * - 実行：POST を送る（副作用を発生させる）
         * - 出力：レスポンス（ただし現状は利用していない）
         */
        fetch(`/api/photos/${photoId}/like`, {
          method: "POST",
        });

        /**
         * 注意（現状の実装の特徴）
         *
         * - fetch の戻り値（Promise）を await していないため、
         *   成功/失敗を確認せず「投げっぱなし」になっている。
         *
         * 実運用では以下を検討することが多い：
         * - await fetch(...) して res.ok を確認し、失敗時にメッセージ表示
         * - ボタン連打防止（リクエスト中は disabled）
         * - 成功したら “いいね済み” 表示に切り替える（ローカル state 更新）
         * - Server Component の一覧を更新したいなら revalidate/refresh の設計を入れる
         */
      }}
    >
      {/**
       * ボタンラベル
       *
       * - ここでは固定文言「いいね」を表示している。
       * - “いいね数” や “押下済み状態” を表示したい場合は state を持たせて拡張する。
       */}
      いいね
    </button>
  );
}