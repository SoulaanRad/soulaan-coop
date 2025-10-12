import { Ionicons, MaterialIcons, FontAwesome5, AntDesign, Feather } from '@expo/vector-icons';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const ChevronRight = ({ size = 24, color = '#000' }: IconProps) => (
  <Ionicons name="chevron-forward" size={size} color={color} />
);

export const ChevronLeft = ({ size = 24, color = '#000' }: IconProps) => (
  <Ionicons name="chevron-back" size={size} color={color} />
);

export const Users = ({ size = 24, color = '#000' }: IconProps) => (
  <Ionicons name="people" size={size} color={color} />
);

export const TrendingUp = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialIcons name="trending-up" size={size} color={color} />
);

export const Store = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialIcons name="storefront" size={size} color={color} />
);

export const Vote = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialIcons name="how-to-vote" size={size} color={color} />
);

export const Shield = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialIcons name="shield" size={size} color={color} />
);

export const Coins = ({ size = 24, color = '#000' }: IconProps) => (
  <FontAwesome5 name="coins" size={size} color={color} />
);

export const Heart = ({ size = 24, color = '#000' }: IconProps) => (
  <AntDesign name="heart" size={size} color={color} />
);

export const Building = ({ size = 24, color = '#000' }: IconProps) => (
  <FontAwesome5 name="building" size={size} color={color} />
);

export const Eye = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="eye" size={size} color={color} />
);

export const EyeOff = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="eye-off" size={size} color={color} />
);

export const Award = ({ size = 24, color = '#000' }: IconProps) => (
  <AntDesign name="trophy" size={size} color={color} />
);
