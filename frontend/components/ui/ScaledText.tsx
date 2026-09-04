import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
} from 'react-native';
import { MAX_FONT_SCALE } from '../../constants/theme';

/**
 * `Text`/`TextInput` with the OS font-size setting capped at MAX_FONT_SCALE.
 *
 * Every screen imports Text from here instead of from 'react-native'. That import
 * rewrite is the whole mechanism — React 19 removed `defaultProps` on function
 * components, and RN 0.81's Text IS a function component, so the old global
 * `Text.defaultProps.maxFontSizeMultiplier` hack silently does nothing now.
 * There is no global switch; the import is the only lever.
 *
 * The cap is a default, not a lock: pass an explicit `maxFontSizeMultiplier` (or
 * `allowFontScaling={false}`) and it still wins.
 */
export const Text = ({ maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }: TextProps) => (
  <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />
);

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  ({ maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }, ref) => (
    <RNTextInput ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />
  ),
);
TextInput.displayName = 'TextInput';
