import { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInUp, FadeOut } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container}>
        {toasts.map(toast => (
          <Animated.View
            key={toast.id}
            entering={SlideInUp.duration(250).springify()}
            exiting={FadeOut.duration(200)}
            style={[styles.toast, toast.type === 'success' && styles.success, toast.type === 'error' && styles.error, toast.type === 'info' && styles.info]}
          >
            <Ionicons
              name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : 'information-circle'}
              size={18}
              color="#fff"
            />
            <Text style={styles.text}>{toast.message}</Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 60, left: 20, right: 20, zIndex: 9999, gap: 8, pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  success: { backgroundColor: Colors.success },
  error: { backgroundColor: Colors.error },
  info: { backgroundColor: Colors.primary },
  text: { color: '#fff', fontSize: 15, fontWeight: '500', flex: 1 },
});
