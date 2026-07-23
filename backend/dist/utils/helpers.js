export const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};
export const generateCode = (prefix, number) => {
    return `${prefix}-${String(number).padStart(3, '0')}`;
};
