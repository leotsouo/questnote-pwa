using System;
using System.Text;
using System.Runtime.InteropServices;
public static class QuestProcessMetadata {
 [StructLayout(LayoutKind.Sequential)] struct PBI { public IntPtr Reserved; public IntPtr Peb; public IntPtr Reserved2; public IntPtr Reserved3; public IntPtr Pid; public IntPtr ParentPid; }
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool ReadProcessMemory(IntPtr process,IntPtr address,byte[] buffer,UIntPtr size,out UIntPtr read);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool IsWow64Process(IntPtr process,out bool wow64);
 [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr process,int type,out PBI info,int size,out int returned);
 static byte[] Read(IntPtr h,long addr,int size){byte[] b=new byte[size];UIntPtr n;if(!ReadProcessMemory(h,new IntPtr(addr),b,(UIntPtr)size,out n)||n.ToUInt64()!=(ulong)size)throw new Exception("Read metadata error "+Marshal.GetLastWin32Error());return b;}
 static string Unicode(IntPtr h,long addr){byte[] descriptor=Read(h,addr,16);int length=BitConverter.ToUInt16(descriptor,0);long ptr=BitConverter.ToInt64(descriptor,8);if(length==0)return "";if(length>32766||length%2!=0||ptr==0)throw new Exception("Invalid metadata string");return Encoding.Unicode.GetString(Read(h,ptr,length));}
 public static string[] ReadCwd(uint pid){IntPtr h=OpenProcess(0x410,false,pid);if(h==IntPtr.Zero)return new[]{"","","OpenProcess error "+Marshal.GetLastWin32Error()};try{bool wow;if(!IsWow64Process(h,out wow)||wow||IntPtr.Size!=8)return new[]{"","","Unsupported architecture"};PBI info;int returned;int result=NtQueryInformationProcess(h,0,out info,Marshal.SizeOf<PBI>(),out returned);if(result!=0)return new[]{"","","NtQueryInformationProcess status "+result};long parameters=BitConverter.ToInt64(Read(h,info.Peb.ToInt64()+0x20,8),0);return new[]{Unicode(h,parameters+0x38),Unicode(h,parameters+0x70),""};}catch(Exception e){return new[]{"","",e.Message};}finally{CloseHandle(h);}}
}
