import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.exceptions import InvalidSignature
import hashlib
import qrcode
import fitz
import shutil
from pathlib import Path
import io
from PIL import Image
import zxing
from pymongo import MongoClient



app = FastAPI()

def generate_key_pair():
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    public_key = private_key.public_key()
    return private_key, public_key

def sign_document(private_key, document_data):
    document_hash = hashlib.sha256(document_data).digest()
    signature = private_key.sign(document_hash, ec.ECDSA(hashes.SHA256()))
    return signature

def generate_qr_code(signature, public_key):
    signature_str = signature.hex()
    public_key_str = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()

    data = f"Signature: {signature_str}\nPublic Key: {public_key_str}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    qr_code_path = "signature_qr_code.png"
    img.save(qr_code_path)
    return qr_code_path

# def write_header(document_data, qr_code_path):
#     image_rectangle = fitz.Rect(450, 20, 550, 120)
#     file_handle = fitz.open("pdf", document_data)
#     first_page = file_handle[0]

#     first_page.insert_image(image_rectangle, filename=qr_code_path)
#     pdf_bytes = file_handle.write()
#     return pdf_bytes

def write_header(document_path, output_path, qr_code_path):
    image_rectangle = fitz.Rect(450, 20, 550, 120)
    file_handle = fitz.open(document_path)
    first_page = file_handle[0]
    first_page.insert_image(image_rectangle, filename=qr_code_path)
    file_handle.save(output_path)

def verify_signature(public_key, document_data, signature):
    document_hash = hashlib.sha256(document_data).digest()
    try:
        public_key.verify(signature, document_hash, ec.ECDSA(hashes.SHA256()))
        return True
    except InvalidSignature:
        return False

def extract_qr_code(image_path):
    reader = zxing.BarcodeReader()
    barcode = reader.decode(image_path)
    return barcode.parsed if barcode else None

@app.post("/generate_keys")
def generate_keys():
    private_key, public_key = generate_key_pair()
    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode()
    public_key_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()
    return {"private_key": private_key_pem, "public_key": public_key_pem}

@app.post("/sign_document")
async def sign_doc(file: UploadFile = File(...)):
    try:
        path = f"files/{file.filename}"
        with open(path, 'w+b') as files:
            shutil.copyfileobj(file.file, files)
        
        private_key, public_key = generate_key_pair()
        print(private_key,file.filename)
        document_data = file.content_type
        document_data = document_data.encode('utf-8')
        signature = sign_document(private_key, document_data)
        print(signature)
        output_path = f"files/signed-{file.filename}"
        qr_code_path = generate_qr_code(signature, public_key)
        write_header(path,output_path,qr_code_path)
        signature = sign_document()
        return FileResponse(output_path, media_type='application/pdf', filename=f"signed_{file.filename}")

        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    # Créer un dossier temporaire pour stocker les fichiers
    temp_dir = Path("tmp")
    temp_dir.mkdir(exist_ok=True)

    # Chemin du fichier PDF téléchargé
    pdf_path = temp_dir / file.filename

    # Enregistrer le fichier téléchargé
    with open(pdf_path, 'wb') as files:
        shutil.copyfileobj(file.file, files)

    # Générer un QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data('Votre texte ou URL')
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')

    # Sauvegarder le QR code en tant qu'image PNG dans un buffer mémoire
    qr_code_path = temp_dir / "qr_code.png"
    img.save(qr_code_path)
    # img_buffer = io.BytesIO()
    # img.save(img_buffer, format="PNG")
    # img_buffer.seek(0)
    # qr_code_bytes = img_buffer.read()

    # Chemin du fichier PDF de sortie
    output_path = temp_dir / f"signed_{file.filename}"

    # Appeler la fonction pour modifier le PDF
    write_header(pdf_path, output_path, qr_code_path)

    return FileResponse(output_path, media_type='application/pdf', filename=f"signed_{file.filename}")



@app.post("/verify_document")
async def verify_doc(file: UploadFile = File(...)):
    document_data = await file.read()
    temp_path = "temp_document.pdf"
    with open(temp_path, "wb") as temp_file:
        temp_file.write(document_data)

    # Extract QR code from the document
    pdf_document = fitz.open(temp_path)
    first_page = pdf_document[0]
    pix = first_page.get_pixmap()
    qr_code_image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    qr_code_image_path = "temp_qr_code.png"
    qr_code_image.save(qr_code_image_path)

    qr_data = extract_qr_code(qr_code_image_path)
    if not qr_data:
        raise HTTPException(status_code=400, detail="QR code not found or unreadable")

    # Parse QR code data
    try:
        signature_str, public_key_str = qr_data.split("\n")
        signature = bytes.fromhex(signature_str.split(": ")[1])
        public_key_pem = public_key_str.split(": ")[1].encode()
        public_key = serialization.load_pem_public_key(public_key_pem, backend=default_backend())
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid QR code data format")

    # Verify digital signature
    is_valid = verify_signature(public_key, document_data, signature)

    return JSONResponse(content={"is_valid": is_valid})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
