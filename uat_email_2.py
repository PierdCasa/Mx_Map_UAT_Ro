import requests
import csv
import time
from scapy.all import IP, UDP, DNS, DNSQR, sr1, RandShort

SERVER_DNS = "8.8.8.8"

def obtine_ip_mail(domeniu):

    #returnam ip-ul coresp. domeniului 
    try:
        # query MX pt. a afla hostname-ul providerului
        pachet_mx = IP(dst=SERVER_DNS) / UDP(sport=RandShort(), dport=53) / DNS(rd=1, qd=DNSQR(qname=domeniu, qtype="MX"))
        raspuns_mx = sr1(pachet_mx, verbose=0, timeout=4)
        
        mail_hostname = None
        
        #ne asiguram ca are answers>0
        if raspuns_mx and raspuns_mx.haslayer(DNS) and raspuns_mx[DNS].ancount > 0:
            rr = raspuns_mx[DNS].an #luam primul record
            # iteram pe toate pt. a-l gasi pe cel MX(tip 15)
            for _ in range(raspuns_mx[DNS].ancount):
                if hasattr(rr, 'type') and rr.type == 15 and hasattr(rr, 'exchange'):
                    valoare = rr.exchange
                    #tratam dif. dintre bystes si string
                    mail_hostname = valoare.decode('utf-8') if isinstance(valoare, bytes) else str(valoare)
                    mail_hostname = mail_hostname.rstrip('.')
                    break #am gasit numele
                rr = rr.payload #continuam cu urm record
                
        #daca nu avem hostname valid returnam placeholder
        if not mail_hostname:
            return "N/A"
            
        #query A pt. a afla IP-ul hostname-ului 
        pachet_a = IP(dst=SERVER_DNS) / UDP(sport=RandShort(), dport=53) / DNS(rd=1, qd=DNSQR(qname=mail_hostname, qtype="A"))
        raspuns_a = sr1(pachet_a, verbose=0, timeout=4)
        
        if raspuns_a and raspuns_a.haslayer(DNS) and raspuns_a[DNS].ancount > 0:
            rr = raspuns_a[DNS].an
            #iteram prin toate pt. a-l gasi pe cel A (tip 1)
            for _ in range(raspuns_a[DNS].ancount):
                if hasattr(rr, 'type') and rr.type == 1 and hasattr(rr, 'rdata'):
                    valoare_ip = rr.rdata
                    return valoare_ip.decode('utf-8') if isinstance(valoare_ip, bytes) else str(valoare_ip)
                rr = rr.payload
                
    except Exception as e:
        
        print(f"eroare pentru {domeniu}: {e}")
    
    return "N/A"

def obtine_tara_ip(ip):

    #folosesc ip-api.com pt. a afla tara de provenienta a provider-ului
    #daca nu avem ip-valid
    if ip == "N/A" or not ip:
        return "N/A"
        
    try:
        #apelam API-ul (ne da json)
        url = f"http://ip-api.com/json/{ip}"
        raspuns = requests.get(url, timeout=5)
        date = raspuns.json()
       
        if date.get("status") == "success":
            #daca e suuces memoram abrevierea tarii
            tara = date.get("countryCode", "N/A")
            provider = date.get("isp", "N/A") 
            #mem. si provider-ul
            
            return tara
            
    except Exception as e:
        print(f"eroare pentru {ip}: {e}")
        
    return "N/A"

#generarea csv-ului

fisier_intrare = "UAT2.csv"
#fisier csv downloadat de pe wikidata 
fisier_iesire = "rezultate_mxmap.csv"
#fisierul pe care il voi folosi in mapa html


with open(fisier_intrare, mode="r", encoding="utf-8") as f_in, \
     open(fisier_iesire, mode="w", encoding="utf-8", newline="") as f_out:
    
    cititor = csv.DictReader(f_in)
    coloane_noi = cititor.fieldnames + ["domeniu", "ip_server_mail", "tara_server"]
    scriitor = csv.DictWriter(f_out, fieldnames=coloane_noi)
    scriitor.writeheader()

    for rand in cititor:
        email = rand.get("email", "") 
        
        if email and "@" in email:
            domeniu = email.split("@")[1].strip()
            print(f"Se verifică {rand.get('itemLabel', 'Localitate')}: {domeniu}...")
            
            #aflu IP-ul
            ip_gasit = obtine_ip_mail(domeniu)
            
            #aflu provenienta sa
            tara_gasita = obtine_tara_ip(ip_gasit)
            
            #salvam datele in rand
            rand["domeniu"] = domeniu
            rand["ip_server_mail"] = ip_gasit
            rand["tara_server"] = tara_gasita
        else:
            rand["domeniu"] = "N/A"
            rand["ip_server_mail"] = "N/A"
            rand["tara_server"] = "N/A"
        
        #scriem in CSV
        scriitor.writerow(rand)
        
        #aici am pus asa pentru a limita request-urile per minut( are 45 max)
        time.sleep(1.5)

print(f"rezultat salvat in {fisier_iesire}")