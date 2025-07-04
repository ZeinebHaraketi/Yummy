import {View, Text, Button} from 'react-native'
import React from 'react'
import {router} from "expo-router";

const SignIn = () => {
    return (
        <View className="gap-10 bg-white rounded-lg p-5 mt-5">
            <Text>SignIn</Text>
            <Button title="Sign Up" onPress={() => router.push('//sign-up')} />
        </View>
    )
}
export default SignIn
