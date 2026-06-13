import zipfile
import xml.etree.ElementTree as ET

docx_path = "../TAO_Recruit_AI_PRD.docx"
try:
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        # Namespace map
        namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        # Find all text elements
        texts = []
        for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            p_text = []
            for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                if node.text:
                    p_text.append(node.text)
            if p_text:
                texts.append("".join(p_text))
            else:
                texts.append("")
                
        out_path = "prd_content.txt"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(texts))
        print("Success! Written to prd_content.txt")
except Exception as e:
    print("Error:", e)
