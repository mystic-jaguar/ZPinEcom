import { Feather } from '@expo/vector-icons';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Feather name="alert-triangle" size={56} color="#F44336" />
                    </View>
                    <Text style={styles.title}>Oops! Something went wrong</Text>
                    <Text style={styles.message}>
                        We encountered an unexpected error. Please try reloading the app.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <Text style={styles.errorText}>
                            {this.state.error.toString()}
                        </Text>
                    )}
                    <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                        <Feather name="refresh-cw" size={18} color="#000" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Reload App</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#FAFAFA',
    },
    iconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FFEBEE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#424242',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#757575',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    errorText: {
        fontSize: 12,
        color: '#F44336',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'monospace',
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#FFC107',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#FFC107',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
});

export default ErrorBoundary;
