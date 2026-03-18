import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import ProductsList from '@/components/ProductsList';

function StorePage() {
  return (
    <>
      <Helmet>
        <title>Loja - DocConnect</title>
        <meta name="description" content="Explore nossa seleção de produtos exclusivos." />
      </Helmet>
       <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Nossa <span className="text-secondary">Loja</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mt-4">
              Descubra produtos cuidadosamente selecionados para o seu bem-estar.
            </p>
        </div>
        <ProductsList />
      </motion.div>
    </>
  );
}

export default StorePage;