import { Image, StyleSheet, View } from 'react-native';
import { POSE_SILHOUETTES, type PoseName } from '@/pose/exercise';
import { colors, radius, spacing } from '../theme/theme';

// 카메라 프리뷰 우하단에 고정된 목표 자세 미리보기. PoseGuideSilhouette가 사람 몸 위에
// 겹치는 반투명 가이드와 달리, 라이브 landmark와 무관하게 항상 같은 자리에 같은 크기로
// 보여 "이 자세를 취하면 된다"를 한눈에 알려준다. 실루엣 PNG는 사람 형태만 불투명한
// RGBA라 tintColor로 검은색을 입히면 배경은 그대로 투명하다.

const THUMBNAIL_SIZE = 120;

type Props = {
  poseName: PoseName | null;
};

export default function PoseTargetThumbnail({ poseName }: Props) {
  if (poseName == null) return null;

  return (
    <View pointerEvents="none" style={styles.card}>
      <Image
        source={POSE_SILHOUETTES[poseName]}
        resizeMode="contain"
        style={styles.image}
        tintColor={colors.black}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    zIndex: 20,
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radius.md,
    padding: spacing.xs,
    opacity: 0.9,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
