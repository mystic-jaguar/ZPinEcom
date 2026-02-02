import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CheckoutProgressProps {
    currentStep: 1 | 2 | 3; // 1: Address, 2: Payment, 3: Summary
}

const steps = [
    { id: 1, label: 'ADDRESS' },
    { id: 2, label: 'SUMMARY' },
    { id: 3, label: 'PAYMENT' },
];

export const CheckoutProgress: React.FC<CheckoutProgressProps> = ({ currentStep }) => {
    return (
        <View style={styles.container}>
            {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                    <React.Fragment key={step.id}>
                        {/* Line connector between steps */}
                        {index > 0 && (
                            <View style={[
                                styles.line,
                                { backgroundColor: currentStep >= step.id ? Colors.light.tint : '#E0E0E0' }
                            ]} />
                        )}

                        <View style={styles.stepContainer}>
                            <View style={[
                                styles.circle,
                                (isActive || isCompleted) && styles.activeCircle
                            ]}>
                                {isCompleted ? (
                                    <Text style={styles.checkMark}>✓</Text>
                                ) : (
                                    <Text style={[
                                        styles.stepNumber,
                                        isActive && styles.activeStepNumber
                                    ]}>{step.id}</Text>
                                )}
                            </View>
                            <Text style={[
                                styles.label,
                                (isActive || isCompleted) && styles.activeLabel
                            ]}>
                                {step.label}
                            </Text>
                        </View>
                    </React.Fragment>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        backgroundColor: '#fff',
    },
    stepContainer: {
        alignItems: 'center',
        zIndex: 1, // Ensure circles are above the line if they overlap (though layout here is side-by-side)
    },
    line: {
        height: 2,
        flex: 1,
        maxWidth: 60,
        marginHorizontal: 5,
        marginBottom: 15, // Align with the center of the circle approximately
    },
    circle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#E0E0E0', // Inactive color (light gray)
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    activeCircle: {
        backgroundColor: Colors.light.tint, // Active color (Yellow/Orange)
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#757575',
    },
    activeStepNumber: {
        color: '#fff',
    },
    checkMark: {
        fontSize: 14,
        color: '#fff',
        fontWeight: 'bold',
    },
    label: {
        fontSize: 10,
        color: '#9E9E9E',
        fontWeight: '600',
    },
    activeLabel: {
        color: Colors.light.tint, // Match active color
    },
});
