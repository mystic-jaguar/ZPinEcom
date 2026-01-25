import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    initiallyExpanded?: boolean;
}

export default function AccordionItem({ title, children, initiallyExpanded = false }: AccordionItemProps) {
    const [expanded, setExpanded] = useState(initiallyExpanded);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <Text style={styles.title}>{title}</Text>
                <Feather
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#1a1a1a"
                />
            </TouchableOpacity>
            {expanded && (
                <View style={styles.content}>
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 0
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a'
    },
    content: {
        paddingBottom: 20
    }
});
