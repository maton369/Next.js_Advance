import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getPhotoComments } from "@/services/getPhotoComments";
import type { Photo } from "@/services/type";
import { ClientPhotoComment } from "./client";

/**
 * Props（PhotoComment の入力）
 *
 * - photo: コメント対象の写真（必須）
 * - userId: “今ログインしているユーザーID” など、クライアント側の操作に使う補助情報（任意）
 *
 * このコンポーネントは Server Component 側で
 * - コメント一覧（comments）
 * - コメント投稿者のユーザー情報（authors）
 * を取得して、Client Component（ClientPhotoComment）に “初期値” として渡す役割を持つ。
 */
type Props = {
  photo: Photo;
  userId?: string;
};

/**
 * PhotoComment（写真に紐づくコメント領域）
 *
 * 重要ポイント：
 * - `unstable_cache` を使って、コメント取得 + 投稿者情報取得という “複数I/O” をまとめてキャッシュしている。
 * - Server 側で取得したデータを Client Component に `defaultComments` として渡すことで、
 *   初期表示を素早くしつつ、クライアント側での追加操作（投稿/削除など）に繋げやすい。
 *
 * アルゴリズム的な見方（キャッシュ付きデータ構築 → クライアントへ受け渡し）：
 * 1. photo.id を入力として、コメント一覧を取得する
 * 2. コメント一覧から authorId を抽出し、重複を排除して authorIds を作る
 * 3. authorIds に一致する User レコードをまとめて取得する（N+1 回避）
 * 4. comments と authors を 1 つの結果として返す（これをキャッシュする）
 * 5. 返ってきた結果を ClientPhotoComment に props として渡し、クライアントUIを構築する
 */
export async function PhotoComment({ photo, userId }: Props) {
  /**
   * comments / authors の取得（unstable_cache によるキャッシュ付き）
   *
   * unstable_cache の構造（ざっくり）：
   * - unstable_cache(fn, keyParts, options) は “キャッシュされた関数” を返す。
   * - 返ってきた関数に引数を渡すと、内部で
   *   - キャッシュにヒットすれば再計算せず結果を返す
   *   - ミスなら fn を実行して結果を保存して返す
   *   という挙動になる。
   *
   * ここでは、
   * - “コメントと投稿者情報を組み立てる処理” を 1 つの関数に閉じ込め、
   * - その結果（comments, authors）をキャッシュする
   * ことで、ページアクセスのたびに毎回 DB/API を叩くコストを抑える狙いがある。
   */
  const { comments, authors } = await unstable_cache(
    /**
     * キャッシュ対象の本体処理（id を受け取って comments/authors を生成）
     *
     * - この関数は “写真ID（id）を入力” として、
     *   “その写真のコメント一覧 + 投稿者ユーザー情報” を出力する。
     *
     * アルゴリズム的に重要なのは：
     * - コメント取得（I/O）
     * - authorId の重複排除（集合化）
     * - User をまとめて取得（in 検索）
     * の 3 ステップで “表示に必要なデータ” を構築している点。
     */
    async (id: string) => {
      /**
       * 1) コメント取得
       *
       * - getPhotoComments は写真IDを元にコメント一覧を返すサービス関数。
       * - 戻り値から comments を取り出して使う。
       *
       * アルゴリズム的には：
       * - “photoId → comments” の解決（1対多の参照を辿る）に相当する。
       */
      const { comments } = await getPhotoComments({ id });

      /**
       * 2) authorIds の抽出（重複排除）
       *
       * - コメントは複数あり、同じ authorId が何度も登場し得る。
       * - そのまま authorId を使ってユーザー取得すると、
       *   - 無駄に同じユーザーを複数回取りに行く
       *   - in 句に重複が混ざって冗長になる
       * などの無駄が出る。
       *
       * そこで：
       * - `comments.map(...)` で authorId を列挙し、
       * - `new Set(...)` で集合化（重複排除）し、
       * - `Array.from(...)` で配列に戻す。
       *
       * アルゴリズム的には：
       * - “配列 → 集合（Set）→ 配列” による一意化処理で、
       *   コメント数を C とすると O(C) で authorIds を作る。
       */
      const authorIds = Array.from(
        new Set(comments.map((comment) => comment.authorId))
      );

      /**
       * 3) 投稿者（authors）の一括取得（N+1 回避）
       *
       * - `prisma.user.findMany({ where: { id: { in: authorIds } } })` により、
       *   authorIds に一致する User をまとめて取得する。
       *
       * これが重要な理由：
       * - コメントが C 件あるときに “コメントごとに user を取る” と C 回クエリが走る（N+1）。
       * - まとめて 1 回のクエリで取ることで、クエリ回数を 1 回に圧縮できる。
       *
       * select を使う理由（転送量の最小化）：
       * - User 全カラムを取るのではなく、UIで必要な項目だけに絞る。
       * - id/name/image と、profile.screenName だけ取得している。
       *
       * profile も select でネスト指定している理由：
       * - User から Profile を “必要な最小限” で辿るため。
       * - ここでは screenName だけあればプロフィールリンク等に使える。
       */
      const authors = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: {
          id: true,
          name: true,
          image: true,
          profile: { select: { screenName: true } },
        },
      });

      /**
       * comments と authors をまとめて返す
       *
       * - 返り値は unstable_cache によりキャッシュされる対象になる。
       * - 呼び出し側（このコンポーネント）は `comments, authors` を受け取って描画に渡す。
       */
      return { comments, authors };
    },

    /**
     * キャッシュキーの “固定部分” （keyParts）
     *
     * - [`photos/comments`] はキャッシュの大枠のキー。
     * - この固定キーに加えて、実際には関数引数（photo.id）も絡んで “キーが具体化” されるイメージになる。
     *
     * アルゴリズム的には：
     * - 「キャッシュの名前空間」を切るための識別子。
     *
     * 注意：
     * - ここを雑にすると、別用途のキャッシュと衝突しやすい。
     * - 一方で細かくしすぎると管理が難しくなる。
     */
    [`photos/comments`],

    /**
     * options（キャッシュ制御）
     *
     * tags の意図：
     * - `tags: [\`photos/${photo.id}/comments\`]` として、
     *   “この写真のコメントキャッシュ” をタグで識別できるようにしている。
     *
     * これにより：
     * - コメント投稿・削除などのタイミングで、
     *   “該当タグのキャッシュだけ” を無効化（再検証）する運用が可能になる。
     *
     * アルゴリズム的には：
     * - 「キャッシュをタグ付きで管理し、イベント（更新）に応じて部分的に破棄する」
     *   という戦略を取っている。
     */
    { tags: [`photos/${photo.id}/comments`] }
  )(
    /**
     * 返ってきた “キャッシュされた関数” を実行する
     *
     * - unstable_cache(...) は関数を返すため、
     *   最後に `(photo.id)` を付けて実行している。
     *
     * ここが “キャッシュの入力” であり、
     * - photo.id が同じなら同じキャッシュ結果を返しやすい
     * - photo.id が違えば別の結果になる
     * というふるまいになる。
     */
    photo.id
  );

  return (
    /**
     * ClientPhotoComment（Client Component）
     *
     * - Server 側で取得したデータを “初期表示用のデフォルト値” として渡す。
     * - クライアント側ではこの初期値を使ってすぐにUIを描画し、
     *   その後のユーザー操作（コメント投稿など）を onClick/onSubmit 等で扱う想定。
     *
     * 渡している props：
     * - photoId: 操作対象を識別する
     * - userId: ログインユーザー（任意）…投稿権限や自分のコメント判定などに使える
     * - defaultComments: 初期表示するコメント一覧
     * - authors: コメント投稿者の表示情報（名前/アイコン/screenName）
     */
    <ClientPhotoComment
      photoId={photo.id}
      userId={userId}
      defaultComments={comments}
      authors={authors}
    />
  );
}