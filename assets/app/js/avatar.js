async function changeAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const base64 = await toBase64(file);
        const response = await fetch('/app/setAvatar', {
            method: 'POST',
            
            credentials: 'include',
            headers: {
                
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64.split(',')[1] })
        });
        if (response.ok) window.location.reload();
    };
    input.click();
}
    
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});