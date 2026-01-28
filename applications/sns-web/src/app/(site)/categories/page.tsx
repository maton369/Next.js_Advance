import Link from "next/link";
import { CardContainer } from "sns-shared-ui/src/components/CardContainer";
import { HeadGroup } from "sns-shared-ui/src/components/HeadGroup";
import { Heading } from "sns-shared-ui/src/components/Heading";
import { PhotoCard } from "sns-shared-ui/src/components/PhotoCard";
import { Section } from "sns-shared-ui/src/components/Section";
import { getCategories } from "@/services/getCategories";

/**
 * Page（カテゴリ一覧ページ）
 *
 * - App Router では `page.tsx` の default export がそのルートのページになる。
 * - `"use client"` が無いので Server Component として動作する。
 *
 * このページの役割：
 * - バックエンド（または API）からカテゴリ一覧を取得し、
 * - “カテゴリごとのカード” として一覧表示し、
 * - クリックでカテゴリ詳細（/categories/[name]）へ遷移できるようにする。
 *
 * アルゴリズム的な見方（データ取得→整形→UI化→ルーティング）：
 * 1. getCategories() でカテゴリ一覧を取得する（I/O）
 * 2. 取得した配列を map して、各カテゴリをカード UI に変換する（射影）
 * 3. 各カードを Link で包み、クリックでカテゴリページへ遷移できるようにする（ナビゲーション）
 * 4. カテゴリが0件ならカード一覧は描画しない（分岐）
 */
export default async function Page() {
  /**
   * カテゴリ一覧の取得
   *
   * - `getCategories()` はサービス層の関数で、カテゴリ一覧を返す。
   * - ここでは戻り値を `data` として受けている。
   *
   * 典型的には以下のような形を想定：
   * - data = { categories: Category[] }
   *
   * Server Component なので：
   * - このデータ取得はブラウザではなくサーバ側で行われ、
   * - 取得後にHTMLを生成してクライアントへ返せる。
   */
  const data = await getCategories();

  return (
    /**
     * Section（セクション枠）
     *
     * - shared-ui の Section により、ページのまとまり（余白や最大幅など）を統一する。
     * - ページ全体の “見た目の規約” を UI ライブラリ側に寄せている構成。
     */
    <Section>
      {/**
       * HeadGroup + Heading（見出し）
       *
       * - “このページがカテゴリ一覧である” ことを宣言する UI。
       * - level={1} は構造上 h1 相当（ページの主見出し）であることを示す。
       */}
      <HeadGroup>
        <Heading level={1} size="medium">
          カテゴリー一覧
        </Heading>
      </HeadGroup>

      {/**
       * 条件付き描画：カテゴリが1件以上ある場合のみ一覧を表示する
       *
       * - `data.categories.length > 0 && (...)` は React でよく使う分岐パターン。
       * - カテゴリが0件のときは CardContainer を描画しない。
       *
       * アルゴリズム的には：
       * - “入力データのサイズ” に応じて UI を分岐する（0件ケースのハンドリング）。
       *
       * 補足：
       * - 0件のときに何も表示されないため、
       *   実運用では「カテゴリがありません」などの空状態UI（Empty State）を置くことも多い。
       */}
      {data.categories.length > 0 && (
        /**
         * CardContainer（カードの並びを管理するコンテナ）
         *
         * - カードのレイアウト（grid/flex、間隔、折り返し等）を提供するコンポーネント。
         * - ページ側では “カードを並べる” だけに集中できるようにしている。
         */
        <CardContainer>
          {/**
           * カテゴリ配列 → UIカード一覧への変換（map）
           *
           * - categories を map して 1カテゴリ = 1カード を生成する。
           * - React のリスト描画では key が必要なので、カテゴリの一意キー（category.id）を使う。
           *
           * アルゴリズム：
           * 1. category を1件取り出す
           * 2. category.name を URL に埋め込む（/categories/<name>）
           * 3. category の表示用データ（label/description/imageUrl）を PhotoCard の props に渡す
           * 4. Link で包み、クリックで遷移可能にする
           */
          {data.categories.map((category) => (
            /**
             * Link（カテゴリページへの遷移）
             *
             * - href={`/categories/${category.name}`} は Dynamic Route（例：app/categories/[categoryName]/page.tsx）を想定。
             * - category.name は URL 向けの識別子（例：flower）として使う設計。
             *
             * key について：
             * - map の最外側要素に key を置くことで、React が差分更新を効率化できる。
             */
            <Link href={`/categories/${category.name}`} key={category.id}>
              {/**
               * PhotoCard（カードUI）
               *
               * - ここでは “写真カード” というコンポーネントを流用して、
               *   カテゴリをカード表示している（見た目の再利用）。
               *
               * props の割り当て：
               * - title: category.label（ユーザー向け表示名）
               * - description: category.description（カテゴリ説明）
               * - imageUrl: category.imageUrl（カテゴリの代表画像）
               *
               * アルゴリズム的には：
               * - Category のデータ構造を PhotoCard の入力形式へ変換（射影）している。
               * - “カードという表示形式” を共通化することで UI の統一感が出る。
               */
              <PhotoCard
                title={category.label}
                description={category.description}
                imageUrl={category.imageUrl}
              />
            </Link>
          ))}
        </CardContainer>
      )}
    </Section>
  );
}