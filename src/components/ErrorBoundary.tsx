import { Component, ErrorInfo, ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[KachAI] ErrorBoundary", error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View className="flex-1 bg-gym-bg px-6 pt-16">
        <Text className="text-2xl font-extrabold text-gym-red">Ошибка запуска</Text>
        <Text className="mt-3 text-sm font-semibold text-gym-muted">
          Скопируй текст ниже и отправь в чат:
        </Text>
        <ScrollView className="mt-4 max-h-96 rounded-xl border border-zinc-800 bg-black p-4">
          <Text className="font-mono text-xs text-white">{this.state.error.message}</Text>
          {this.state.error.stack ? (
            <Text className="mt-3 font-mono text-[10px] text-gym-muted">{this.state.error.stack}</Text>
          ) : null}
        </ScrollView>
        <Pressable
          className="mt-6 h-12 items-center justify-center rounded-xl bg-gym-red"
          onPress={() => this.setState({ error: null })}
        >
          <Text className="font-extrabold uppercase text-white">Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }
}
