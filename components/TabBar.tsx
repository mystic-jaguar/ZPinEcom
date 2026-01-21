import { Feather, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

// Interactive Tab Bar implementing the design from Home Screen
export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
        <View style={styles.bottomNav}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                let iconName: any;
                let IconComponent: any = Feather;
                let label = "Home"; // Default

                // Define icons based on route name
                if (route.name === 'index') {
                    label = "Home";
                    iconName = "home";
                    IconComponent = Feather;
                } else if (route.name === 'categories') {
                    label = "Categories";
                    iconName = "grid-view";
                    IconComponent = MaterialIcons;
                } else if (route.name === 'hot') {
                    label = "Hot";
                    iconName = "fire";
                    IconComponent = FontAwesome5;
                } else if (route.name === 'profile') {
                    label = "Profile";
                    iconName = "user";
                    IconComponent = Feather;
                }

                const color = isFocused ? '#FBBF24' : '#999';

                return (
                    <TouchableOpacity
                        key={index}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        onPress={onPress}
                        style={styles.navItem}
                    >
                        <IconComponent name={iconName} size={24} color={color} />
                        <Text style={[styles.navText, { color }]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bottomNav: {
        flexDirection: 'row',
        height: 70,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    navText: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: '600',
    },
});
