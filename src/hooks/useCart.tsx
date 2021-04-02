import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock>(`stock/${productId}`);

      const stock = stockResponse.data.amount;

      const checkIfProductAlreadyInCart = cart.find(product => product.id === productId);

      if (checkIfProductAlreadyInCart) {
        const newAmount = checkIfProductAlreadyInCart.amount + 1;

        if (newAmount > stock) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        updateProductAmount({
          productId, 
          amount: newAmount
        });
      } else {
        const response = await api.get<Product>(`products/${productId}`);

        const productToAdd = response.data;

        if (productToAdd) {
          if (!stock) {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }

          const updatedCart = [
            ...cart,
            {
              ...productToAdd,
              amount: 1
            }
          ];

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
          setCart(updatedCart);
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const checkIfProductExists = cart.find(product => product.id === productId);

      if (!checkIfProductExists) {
        throw new Error();
      }

      const updatedCart = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockResponse = await api.get<Stock>(`stock/${productId}`);

      const stock = stockResponse.data.amount;

      if (amount > stock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(product => product.id === productId ? {
        ...product,
        amount,
      } : product)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
