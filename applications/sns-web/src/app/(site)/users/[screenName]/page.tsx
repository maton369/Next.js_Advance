import { notFound } from "next/navigation";
import { CardContainer } from "sns-shared-ui/src/components/CardContainer";
import { HeadGroup } from "sns-shared-ui/src/components/HeadGroup";
import { Heading } from "sns-shared-ui/src/components/Heading";
import { PhotoCard } from "sns-shared-ui/src/components/PhotoCard";
import { ProfilePanel } from "sns-shared-ui/src/components/ProfilePanel";
import { Section } from "sns-shared-ui/src/components/Section";
import { Typography } from "sns-shared-ui/src/components/Typography";
import { profiles } from "@/_mock";
import { PhotoViewModalContainer } from "@/app/_components/PhotoViewModalContainer";
import { getPhotos } from "@/services/getPhotos";

/**
 * Props（Dynamic Route の params）
 *
 * - App Router の Dynamic Segment（例：`app/users/[screenName]/page.tsx`）では、
 *   URL の `[screenName]` の部分が `params.screenName` として渡される。
 *
 * 例：
 * - /users/alice  → params.screenName === "alice"
 * - /users/bob    → params.screenName === "bob"
 *
 * アルゴリズム的には：
 * - URL のパスに埋め込まれた “識別子（screenName）” を抽出し、
 *   それをキーとして「誰のページを表示するか」を決める入力値として使う。
 */
type Props = {
  params: { screenName: string };
};

/**
 * Page（ユーザープロフィール + 投稿写真一覧ページ）
 *
 * - `"use client"` が無いので Server Component として実行される。
 * - `async` 関数なので、サーバ側でデータ取得してから HTML を生成できる。
 *
 * このページの目的：
 * - URL の screenName からユーザー（プロフィール）を解決し、
 * - そのユーザーが投稿した写真一覧を取得して表示する。
 *
 * アルゴリズム的な見方（入力→解決→取得→分岐→描画）：
 * 1. 入力：params.screenName（URL由来）
 * 2. screenName でプロフィールを検索する（profiles から find）
 * 3. 見つからなければ notFound() を呼び 404 ページへ
 * 4. 見つかったら userId を使って投稿写真を取得する（getPhotos({ authorId }))
 * 5. 取得した photos を “カード一覧” として表示する
 * 6. photos が 0 件なら空状態 UI（投稿がありません）を表示する
 */
export default async function Page({ params }: Props) {
  // 🚧: ここでプロフィールを取得する

  /**
   * profile の解決（screenName → profile）
   *
   * - 現状は `profiles`（@/_mock）から検索しているため “仮実装” である。
   * - `Array.prototype.find` は「条件に合う最初の要素」を返し、
   *   見つからなければ undefined になる。
   *
   * アルゴリズム的には：
   * - “screenName をキーにしてプロフィールを引き当てる” 検索処理。
   *
   * 計算量の観点：
   * - profiles の件数を U とすると、この find は最悪 O(U)。
   * - 実運用で件数が増える場合は DB のインデックス検索（O(log U) 〜）等に寄せるのが一般的。
   */
  const profile = profiles.find(
    (profile) => profile.screenName === params.screenName
  );

  /**
   * プロフィールが見つからない場合は 404（notFound）
   *
   * - `notFound()` は Next.js の App Router の機能で、
   *   これを呼ぶと “このルートは存在しない” として 404 ページ（not-found.tsx）へ分岐する。
   *
   * アルゴリズム的には：
   * - “入力 screenName が不正/未知” であるケースを検出し、
   *   通常の描画フローを中断して 404 フローへ切り替える分岐点。
   */
  if (!profile) {
    notFound();
  }

  // 🚧: 該当ユーザーの投稿写真を取得する

  /**
   * 投稿写真の取得（userId → photos）
   *
   * - `getPhotos({ authorId: profile.userId })` のように
   *   authorId（投稿者ID）を条件として写真一覧を取得している。
   *
   * ここで profile が必ず存在する前提が成立している理由：
   * - 上の if (!profile) notFound() により、profile が undefined の場合はここに到達しない。
   *
   * アルゴリズム的には：
   * - “プロフィール（screenName）でユーザーを特定” → “userId で写真を検索”
   * という 2 段階の解決である。
   *
   * 典型的な現実の流れ：
   * - users テーブルで screenName から userId を取得
   * - photos テーブルで authorId = userId のレコードを取得
   */
  const { photos } = await getPhotos({ authorId: profile.userId });

  return (
    <>
      {/**
       * ProfilePanel（プロフィール表示UI）
       *
       * - ユーザーの基本情報（アイコン/名前/screenName/bio など）を表示するコンポーネント。
       *
       * 現状の props：
       * - imageUrl, name が空文字になっているため “未実装” の状態。
       * - screenName, bio は mock から取得した値を渡している。
       *
       * アルゴリズム的には：
       * - 解決済みの profile 情報を UI 入力として渡し、
       *   画面上のプロフィール領域へ変換する工程。
       */}
      <ProfilePanel
        imageUrl={""}
        name={""}
        screenName={profile.screenName || ""}
        bio={profile.bio || ""}
      />

      {/**
       * 投稿写真一覧セクション
       *
       * - 見出し + 写真カード一覧（または空状態）を表示するまとまり。
       */}
      <Section>
        <HeadGroup>
          {/**
           * Heading（セクション見出し）
           *
           * - level={2} は h2 相当で、ページ内のセクション見出しとして適切。
           */}
          <Heading level={2} size="medium">
            投稿写真一覧
          </Heading>
        </HeadGroup>

        {/**
         * 条件分岐：photos の件数に応じて表示を切り替える
         *
         * - photos.length > 0 のとき：カード一覧
         * - 0 件のとき：空状態メッセージ
         *
         * アルゴリズム的には：
         * - データ有無に応じた UI の分岐（Empty State のハンドリング）。
         */}
        {photos.length > 0 ? (
          /**
           * CardContainer（カードを並べるコンテナ）
           *
           * - カードの並び（grid/flex、余白、折返し）などの責務を持つ想定。
           */
          <CardContainer>
            {/**
             * 写真配列 → UI への変換（map）
             *
             * - 各 photo を PhotoCard に変換して表示する。
             * - PhotoViewModalContainer で包むことで、
             *   クリック時にモーダル表示する等のインタラクションを付与できる。
             *
             * アルゴリズム：
             * 1. photos を1件ずつ取り出す
             * 2. photo.id を key にしてリスト差分更新を安定化
             * 3. モーダルコンテナに photo を渡す（閲覧対象のコンテキスト）
             * 4. 子要素として PhotoCard に photo を展開して見た目を描画
             */
            {photos.map((photo) => (
              <PhotoViewModalContainer key={photo.id} photo={photo}>
                <PhotoCard {...photo} />
              </PhotoViewModalContainer>
            ))}
          </CardContainer>
        ) : (
          /**
           * Typography（空状態表示）
           *
           * - 投稿が無い場合に、ユーザーに分かりやすく “何も無い” ことを伝える。
           * - 実運用では “投稿を促す導線（ボタン）” を置く設計もよくある。
           */
          <Typography>投稿がありません</Typography>
        )}
      </Section>
    </>
  );
}