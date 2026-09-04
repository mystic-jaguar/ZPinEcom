import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Download, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { createStyles, colors, fonts, palette, radius } from '../../constants/theme';
import { invoiceFileName } from '../../utils/invoiceHtml';
import { Text } from '../ui/ScaledText';

interface Props {
    visible: boolean;
    html: string;
    orderNumber: string;
    onClose: () => void;
}

/**
 * Full-screen invoice preview. The WebView renders the exact same HTML that
 * expo-print turns into the PDF, so what the customer sees is what they save.
 */
export default function InvoicePreviewModal({ visible, html, orderNumber, onClose }: Props) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const download = async () => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const { uri } = await Print.printToFileAsync({ html });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `${invoiceFileName(orderNumber)}.pdf`,
                    UTI: 'com.adobe.pdf',
                });
            } else {
                // No share sheet (rare) — fall back to the system print/save dialog.
                await Print.printAsync({ html });
            }
        } catch {
            setError('Could not generate the invoice. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                        <X size={20} color={colors.textStrong} />
                    </Pressable>
                    <Text style={styles.title} numberOfLines={1}>Invoice</Text>
                    <View style={styles.closeBtn} />
                </View>

                <WebView
                    originWhitelist={['*']}
                    source={{ html }}
                    style={styles.web}
                    javaScriptEnabled={false}
                    scalesPageToFit={Platform.OS === 'android'}
                    startInLoadingState
                />

                {!!error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.footer}>
                    <Pressable style={styles.downloadBtn} onPress={download} disabled={busy}>
                        {busy ? (
                            <ActivityIndicator size="small" color={colors.textOnYellow} />
                        ) : (
                            <Download size={17} color={colors.textOnYellow} />
                        )}
                        <Text style={styles.downloadText}>{busy ? 'Preparing…' : 'Download PDF'}</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = createStyles({
    container: { flex: 1, backgroundColor: palette.paperWarm },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    closeBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle },
    title: { flex: 1, textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 17, color: colors.textStrong },
    web: { flex: 1, backgroundColor: '#fff' },
    error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: palette.red500, textAlign: 'center', paddingHorizontal: 20, paddingTop: 10 },
    footer: { padding: 16 },
    downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: radius.md, backgroundColor: palette.yellow500 },
    downloadText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textOnYellow },
});
