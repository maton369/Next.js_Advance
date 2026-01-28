"use client";

/**
 * TopPhotos（トップページの「最新投稿」セクション）
 *
 * - `"use client"` により、このコンポーネントは Client Component としてブラウザ上で動作する。
 *
 * なぜ Client Component なのか（この実装から読み取れる理由）：
 * - `PhotoViewModalContainer` がモーダル表示（クリックで開く等）を担う可能性が高く、
 *   その場合は onClick / state / portal など “ブラウザのインタラクション” が必要になる。
 * - つまり、一覧表示自体は静的でも、UI 操作（モーダル）を含むためクライアント側で動かす設計。
 *
 * アルゴリズム的な見方（データ → UI 変換 + インタラクション付与）：
 * 1. 入力：photos（写真データ配列）
 * 2. 見出し/UI枠（Section / HeadGroup / Heading）を構築する
 * 3. photos を map し、各 photo を “カードUI + モーダル機能” に変換する
 * 4. モーダルコンテナを親にして、子に PhotoCard を差し込む（子要素パターン）
 * 5. ブラウザ上で「クリック → モーダルを開く」などの挙動が可能になる
 */

import { HeadGroup } from "sns-shared-ui/src/components/HeadGroup";
import { Heading } from "sns-shared-ui/src/components/Heading";
import { PhotoCard } from "sns-shared-ui/src/components/PhotoCard";
import { Section } from "sns-shared-ui/src/components/Section";
import { PhotoViewModalContainer } from "@/app/_components/PhotoViewModalContainer";
import type { Photo } from "@/services/type";
import styles from "./style.module.css";

/**
 * Props
 *
 * - TopPhotos は “描画に必要なデータだけ” を受け取るプレゼンテーション寄りのコンポーネント。
 * - `photos: Photo[]` が与えられれば、最新投稿一覧をレンダリングできる。
 *
 * 設計的メリット：
 * - 取得ロジック（fetch/Prisma 等）と描画ロジックが分離できる
 * - Storybook などで UI 単体テストしやすい
 */
type Props = {
  photos: Photo[];
};

/**
 * TopPhotos（最新投稿の一覧表示）
 *
 * 入力（photos）を UI に変換する “射影（projection）” が本体のアルゴリズムである。
 * - データ構造（配列） → UI構造（カード一覧）へ変換する
 *
 * この関数は Client Component なので、
 * - 写真カード表示
 * - モーダル開閉などのインタラクション
 * をブラウザで完結できる。
 */
export function TopPhotos({ photos }: Props) {
  return (
    <>
      {/**
       * Section（セクション枠）
       *
       * - 画面のまとまりを作るための UI コンポーネント。
       * - 余白や最大幅などのレイアウト責務を持っていることが多い。
       */}
      <Section>
        {/**
         * HeadGroup + Heading（セクション見出し）
         *
         * - HeadGroup: 見出し周りの配置（タイトル + アクションボタン等）を整えるコンテナであることが多い。
         * - Heading: 見出しテキスト。level=1 は h1 相当、size="medium" は表示サイズ指定。
         *
         * UIアルゴリズム的には：
         * - “セクションの意味（最新投稿）” を視覚的・構造的に宣言している。
         */}
        <HeadGroup>
          <Heading level={1} size="medium">
            最新投稿
          </Heading>
        </HeadGroup>

        {/**
         * カード一覧のコンテナ
         *
         * - styles.cardContainer は CSS Modules によりローカルスコープで適用される。
         * - ここで grid / flex などを使ってカードの並びを調整する想定。
         */}
        <div className={styles.cardContainer}>
          {/**
           * 写真一覧の描画（map による変換）
           *
           * - photos 配列を map して、各 photo を UI（PhotoCard + ModalContainer）に変換する。
           * - React のリスト表示では key が必要なので、photo.id を key に使う。
           *
           * アルゴリズム：
           * 1. photos の各要素 photo を順に処理する
           * 2. photo を PhotoViewModalContainer に渡し、モーダルで表示するための “文脈” を付与する
           * 3. 子要素として PhotoCard を渡し、見た目（カード表示）を担当させる
           *
           * この構成（Container が children を受け取る）により、
           * - “カード表示” と “モーダル制御” を分離できる。
           * - どんな見た目の子でも、同じモーダル機構で包める（再利用性が高い）。
           */}
          {photos.map((photo) => (
            <PhotoViewModalContainer key={photo.id} photo={photo}>
              {/**
               * PhotoCard（写真カード表示）
               *
               * - `{...photo}` は photo のプロパティをそのまま props として渡すスプレッド。
               * - PhotoCard が Photo 型のフィールド（id/title/url など）を props として受け取る設計を想定。
               *
               * アルゴリズム的には：
               * - データ（photo）をカードUIの入力へ “展開” し、
               * - UIコンポーネントが表示に変換する、という責務分離。
               */}
              <PhotoCard {...photo} />
            </PhotoViewModalContainer>
          ))}
        </div>
      </Section>
    </>
  );
}